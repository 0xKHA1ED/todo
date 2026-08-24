'use client'

import { create } from 'zustand'
import { visitTargetIds } from '@/lib/place/placeModel'
import * as queries from '@/lib/supabase/queries'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { defaultEditorContent } from '@/lib/utils'
import type { CreateNodePayload, NodeRecord, UpdateNodePayload } from '@/types'

const ROOT_TITLE = 'Main'
const INBOX_TITLE = 'Inbox'

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
  } else if (inbox.parent_id !== root.id) {
    await queries.reparentNode(inbox.id, root.id, -1)
    nodes = nodes.map((node) => (node.id === inbox.id ? { ...node, parent_id: root.id, sort_order: -1 } : node))
  }

  return nodes
}

interface NodeStore {
  nodes: NodeRecord[]
  loading: boolean
  error: string | null
  fetchAllNodes: () => Promise<void>
  createNode: (payload: CreateNodePayload) => Promise<NodeRecord>
  updateNode: (id: string, patch: UpdateNodePayload) => Promise<void>
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
    set({ loading: true, error: null })
    try {
      let nodes = await queries.fetchNodes(userId)
      nodes = await ensureSystemNodes(userId, nodes)
      set({ nodes: sortNodes(nodes), loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load nodes.'
      set({ error: message, loading: false })
      throw error
    }
  },

  async createNode(payload) {
    const userId = requireUserId()
    const siblings = get().nodes.filter((node) => node.parent_id === payload.parent_id)
    const created = await queries.createNode({
      user_id: userId,
      parent_id: payload.parent_id,
      system_role: payload.system_role ?? null,
      title: payload.title ?? 'New Task',
      urgency: payload.urgency ?? 'normal',
      date: payload.date ?? null,
      tags: payload.tags ?? [],
      description: payload.description ?? defaultEditorContent(),
      sort_order: payload.sort_order ?? siblings.length,
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

    const nextSortOrder = get().nodes.filter((node) => node.parent_id === newParentId && node.id !== id).length

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
