'use client'

import { create } from 'zustand'
import { visitTargetIds } from '@/lib/place/placeModel'
import { ContainerConversionError } from '@/lib/life-pm/errors'
import { mergeImportedSession } from '@/lib/life-pm/importSession'
import { emptyStageHtml, needsStageTemplate } from '@/lib/life-pm/stageContent'
import { newLeafStageStatus } from '@/lib/life-pm/types'
import {
  canCreateTask,
  canSignOff,
  defaultKindForParent,
  defaultTitleForKind,
  isWorkflowLeaf,
  nextStage,
  validateChildKind,
} from '@/lib/life-pm/workflowModel'
import * as queries from '@/lib/supabase/queries'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { defaultEditorContent, getPlainTextFromTipTap } from '@/lib/utils'
import type { CreateNodePayload, NodeKind, NodeRecord, UpdateNodePayload } from '@/types'

const ROOT_TITLE = 'Main'
const INBOX_TITLE = 'Inbox'
let fetchAllNodesPromise: Promise<void> | null = null

async function ensureSystemNodes(userId: string, existingNodes: NodeRecord[]) {
  let nodes = [...existingNodes]
  let root = nodes.find((node) => node.parent_id === null) ?? null

  if (!root) {
    root = await queries.createNode({
      user_id: userId,
      parent_id: null,
      title: ROOT_TITLE,
      urgency: 'normal',
      tags: [],
      description: defaultEditorContent(),
      sort_order: 0,
    })
    nodes = [root, ...nodes]
  }

  const inbox = nodes.find((node) => node.system_role === 'inbox') ?? null

  if (!inbox) {
    try {
      const createdInbox = await queries.createNode({
        user_id: userId,
        parent_id: root.id,
        system_role: 'inbox',
        title: INBOX_TITLE,
        urgency: 'normal',
        tags: [],
        description: defaultEditorContent(),
        sort_order: -1,
      })
      nodes = [...nodes, createdInbox]
    } catch (error) {
      const refreshedNodes = await queries.fetchNodes(userId)
      const existingInbox = refreshedNodes.find((node) => node.system_role === 'inbox')
      if (!existingInbox) {
        throw error
      }
      nodes = refreshedNodes
    }
  } else if (inbox.parent_id !== root.id) {
    await queries.reparentNode(inbox.id, root.id, -1)
    nodes = nodes.map((node) => (node.id === inbox.id ? { ...node, parent_id: root.id, sort_order: -1 } : node))
  }

  return nodes
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pmInsertForKind(kind: NodeKind, payload: CreateNodePayload) {
  const isWorkflowKind = kind === 'project' || kind === 'module'
  const seededDocs = isWorkflowKind ? { problem: emptyStageHtml('problem') } : {}
  return {
    kind,
    pm_status: payload.pm_status ?? 'active',
    outcome: payload.outcome ?? '',
    domain_tag: payload.domain_tag ?? null,
    health: payload.health ?? null,
    workflow_stage: payload.workflow_stage ?? (isWorkflowKind ? 'problem' : null),
    stage_status: payload.stage_status ?? (isWorkflowKind ? newLeafStageStatus() : {}),
    stage_docs: payload.stage_docs ?? seededDocs,
    stage_summaries: payload.stage_summaries ?? {},
    decisions: payload.decisions ?? [],
    open_questions: payload.open_questions ?? [],
    break_glass: payload.break_glass ?? null,
  }
}

interface NodeStore {
  nodes: NodeRecord[]
  loading: boolean
  error: string | null
  fetchAllNodes: () => Promise<void>
  createNode: (payload: CreateNodePayload) => Promise<NodeRecord>
  updateNode: (id: string, patch: UpdateNodePayload) => Promise<void>
  importSessionMd: (nodeId: string, rawMd: string) => Promise<{ warnings: string[] }>
  signOffStage: (nodeId: string) => Promise<void>
  skipReview: (nodeId: string) => Promise<void>
  breakGlassToExecute: (nodeId: string, reason: string) => Promise<void>
  promoteInboxItem: (
    inboxItemId: string,
    options: { kind: 'project' | 'module'; parentId: string; title?: string },
  ) => Promise<NodeRecord>
  deleteNode: (id: string) => Promise<void>
  reparentNode: (id: string, newParentId: string | null) => Promise<void>
  markVisited: (placeId: string) => Promise<void>
  getChildren: (parentId: string | null) => NodeRecord[]
  getAncestors: (id: string) => NodeRecord[]
  getSubtreeIds: (id: string) => string[]
}

function sortNodes(nodes: NodeRecord[]) {
  return [...nodes].sort((a, b) => {
    if (a.parent_id === b.parent_id) return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    return (a.parent_id ?? '').localeCompare(b.parent_id ?? '')
  })
}

function requireUserId() {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('You must be signed in to modify nodes.')
  return userId
}

export const useNodeStore = create<NodeStore>((set, get) => ({
  nodes: [],
  loading: false,
  error: null,

  async fetchAllNodes() {
    const userId = requireUserId()
    if (fetchAllNodesPromise) {
      return fetchAllNodesPromise
    }

    fetchAllNodesPromise = (async () => {
      set({ loading: true, error: null })
      try {
        let nodes = await queries.fetchNodes(userId)
        nodes = await ensureSystemNodes(userId, nodes)
        set({ nodes: sortNodes(nodes), loading: false })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load nodes.'
        set({ error: message, loading: false })
        throw error
      } finally {
        fetchAllNodesPromise = null
      }
    })()

    return fetchAllNodesPromise
  },

  async createNode(payload) {
    const userId = requireUserId()
    const nodes = get().nodes
    const parent = payload.parent_id ? nodes.find((node) => node.id === payload.parent_id) ?? null : null
    const kind = payload.kind ?? (parent ? defaultKindForParent(parent, nodes) : 'project')

    if (parent) {
      if (
        kind === 'module' &&
        (parent.kind === 'project' || parent.kind === 'module') &&
        isWorkflowLeaf(parent, nodes)
      ) {
        const pastProblem = parent.workflow_stage && parent.workflow_stage !== 'problem'
        if (pastProblem && !payload.confirmContainer) {
          throw new ContainerConversionError()
        }
      }
      const invalid = validateChildKind(parent, kind, nodes)
      if (invalid) throw new Error(invalid)
    }

    const siblings = nodes.filter((node) => node.parent_id === payload.parent_id)
    const created = await queries.createNode({
      user_id: userId,
      parent_id: payload.parent_id,
      system_role: payload.system_role ?? null,
      title: payload.title ?? defaultTitleForKind(kind),
      urgency: payload.urgency ?? 'normal',
      date: payload.date ?? null,
      tags: payload.tags ?? [],
      description: payload.description ?? defaultEditorContent(),
      sort_order: payload.sort_order ?? siblings.length,
      ...pmInsertForKind(kind, payload),
    })
    set((state) => ({ nodes: sortNodes([...state.nodes, created]) }))
    return created
  },

  async updateNode(id, patch) {
    const previous = get().nodes
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    }))
    try {
      await queries.updateNode(id, patch)
    } catch (error) {
      set({ nodes: previous })
      throw error
    }
  },

  async importSessionMd(nodeId, rawMd) {
    const node = get().nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error('Node not found.')
    const merged = mergeImportedSession(node, rawMd)
    if (!merged.ok) {
      throw new Error(merged.errors.join('\n'))
    }
    if (merged.patch) {
      await get().updateNode(nodeId, merged.patch)
    }
    return { warnings: merged.warnings }
  },

  async signOffStage(nodeId) {
    const nodes = get().nodes
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error('Node not found.')
    if (!isWorkflowLeaf(node, nodes)) throw new Error('Workflow lives on leaf projects and modules.')
    const current = node.workflow_stage
    if (!current) throw new Error('No active workflow stage.')
    if (!canSignOff(node, nodes)) {
      throw new Error(
        current === 'execute' ? 'Complete all work items before review.' : 'Finish this stage before signing off.',
      )
    }
    const next = nextStage(current)
    const stage_status = {
      ...node.stage_status,
      [current]: 'complete' as const,
      ...(next ? { [next]: 'in_progress' as const } : {}),
    }
    const stage_docs =
      next && needsStageTemplate(node.stage_docs[next])
        ? { ...node.stage_docs, [next]: emptyStageHtml(next) }
        : node.stage_docs
    await get().updateNode(nodeId, {
      workflow_stage: next ?? current,
      stage_status,
      stage_docs,
      ...(next === null && node.kind === 'project' ? { pm_status: 'done' as const } : {}),
    })
  },

  async skipReview(nodeId) {
    const nodes = get().nodes
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error('Node not found.')
    if (node.kind !== 'module') throw new Error('Only modules can skip review.')
    if (node.workflow_stage !== 'execute') throw new Error('Review can only be skipped after Execute.')
    if (node.workflow_stage === 'execute' && !canSignOff(node, nodes)) {
      throw new Error('Complete all work items before skipping review.')
    }
    await get().updateNode(nodeId, {
      workflow_stage: 'review',
      stage_status: { ...node.stage_status, execute: 'complete', review: 'complete' },
      pm_status: node.pm_status === 'active' ? 'done' : node.pm_status,
    })
  },

  async breakGlassToExecute(nodeId, reason) {
    const trimmed = reason.trim()
    if (!trimmed) throw new Error('A reason is required to skip ahead.')
    const nodes = get().nodes
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error('Node not found.')
    if (!isWorkflowLeaf(node, nodes)) throw new Error('Emergency skip is only available on leaf projects and modules.')
    if (node.workflow_stage === 'execute' || node.workflow_stage === 'review') {
      throw new Error('This work is already in Execute or Review.')
    }
    if (node.break_glass?.used) throw new Error('Emergency skip has already been used for this work.')
    await get().updateNode(nodeId, {
      workflow_stage: 'execute',
      break_glass: { used: true, reason: trimmed, at: new Date().toISOString() },
      stage_status: { ...node.stage_status, execute: 'in_progress' },
    })
  },

  async promoteInboxItem(inboxItemId, options) {
    const item = get().nodes.find((candidate) => candidate.id === inboxItemId)
    if (!item) throw new Error('Inbox item not found.')
    const extra = getPlainTextFromTipTap(item.description)
    const seed = extra && extra !== item.title ? `${item.title}. ${extra}` : item.title
    const created = await get().createNode({
      parent_id: options.parentId,
      kind: options.kind,
      title: options.title?.trim() || item.title,
      workflow_stage: 'problem',
      stage_status: newLeafStageStatus(),
      stage_docs: { problem: `<h2>Problem statement</h2><p>${escapeHtml(seed)}</p>` },
      stage_summaries: { problem: item.title },
    })
    await get().deleteNode(inboxItemId)
    return created
  },

  async deleteNode(id) {
    const selected = get().nodes.find((node) => node.id === id)
    if (!selected) return
    if (selected.parent_id === null) throw new Error('The root node cannot be deleted.')
    if (selected.system_role === 'inbox') throw new Error('Inbox cannot be deleted.')

    const previous = get().nodes
    const subtreeIds = new Set(get().getSubtreeIds(id))
    set((state) => ({ nodes: state.nodes.filter((node) => !subtreeIds.has(node.id)) }))
    try {
      await queries.deleteNodeCascade(id)
    } catch (error) {
      set({ nodes: previous })
      throw error
    }
  },

  async reparentNode(id, newParentId) {
    const selected = get().nodes.find((node) => node.id === id)
    if (!selected) return
    if (selected.parent_id === null) throw new Error('The root node cannot be re-parented.')
    if (selected.system_role === 'inbox') throw new Error('Inbox cannot be moved.')
    if (newParentId === id) throw new Error('A node cannot be parented to itself.')

    const nodes = get().nodes
    const parent = newParentId ? nodes.find((node) => node.id === newParentId) ?? null : null
    const movingKind = selected.kind ?? 'task'
    if (parent) {
      if (movingKind === 'task' && parent.kind && !canCreateTask(parent, nodes) && parent.system_role !== 'inbox') {
        throw new Error('Tasks unlock in Execute. Finish the earlier stages first, or use emergency skip.')
      }
      const invalid = validateChildKind(parent, movingKind, nodes)
      if (invalid && movingKind !== 'task') throw new Error(invalid)
    }

    const nextSortOrder = nodes.filter((node) => node.parent_id === newParentId && node.id !== id).length

    const previous = get().nodes
    set((state) => ({
      nodes: sortNodes(
        state.nodes.map((node) =>
          node.id === id ? { ...node, parent_id: newParentId, sort_order: nextSortOrder } : node,
        ),
      ),
    }))
    try {
      await queries.reparentNode(id, newParentId, nextSortOrder)
    } catch (error) {
      set({ nodes: previous })
      throw error
    }
  },

  async markVisited(placeId: string) {
    const ids = visitTargetIds(get().nodes, placeId)
    if (ids.length === 0) return
    const timestamp = new Date().toISOString()
    const previousVisitedAt = new Map(
      get().nodes.filter((node) => ids.includes(node.id)).map((node) => [node.id, node.last_visited_at]),
    )
    set({
      nodes: get().nodes.map((node) => (ids.includes(node.id) ? { ...node, last_visited_at: timestamp } : node)),
    })
    try {
      await Promise.all(ids.map((id) => queries.updateNode(id, { last_visited_at: timestamp })))
    } catch (error) {
      set({
        nodes: get().nodes.map((node) =>
          previousVisitedAt.has(node.id) ? { ...node, last_visited_at: previousVisitedAt.get(node.id) ?? null } : node,
        ),
      })
      throw error
    }
  },

  getChildren(parentId) {
    return sortNodes(get().nodes.filter((node) => node.parent_id === parentId))
  },

  getAncestors(id) {
    const ancestors: NodeRecord[] = []
    let current = get().nodes.find((node) => node.id === id)
    while (current?.parent_id) {
      const parent = get().nodes.find((node) => node.id === current?.parent_id)
      if (!parent) break
      ancestors.unshift(parent)
      current = parent
    }
    return ancestors
  },

  getSubtreeIds(id) {
    const nodes = get().nodes
    const ids = new Set<string>()
    const visit = (nodeId: string) => {
      ids.add(nodeId)
      nodes.filter((node) => node.parent_id === nodeId).forEach((child) => visit(child.id))
    }
    visit(id)
    return Array.from(ids)
  },
}))
