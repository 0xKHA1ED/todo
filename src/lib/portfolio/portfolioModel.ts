import { STALE_MS, subtreeDescendants } from '@/lib/place/placeModel'
import { hasChildModules, isWorkflowLeaf, stageIndex } from '@/lib/life-pm/workflowModel'
import type { NodeRecord, PmStatus } from '@/types'

export function listProjects(nodes: NodeRecord[]): NodeRecord[] {
  return nodes.filter((node) => node.kind === 'project' && node.system_role == null)
}

function leafModulesOf(nodes: NodeRecord[], projectId: string): NodeRecord[] {
  return [nodes.find((node) => node.id === projectId), ...subtreeDescendants(nodes, projectId)].filter(
    (node): node is NodeRecord =>
      Boolean(node && node.kind === 'module' && isWorkflowLeaf(node, nodes) && !hasChildModules(nodes, node.id)),
  )
}

function byTitle(a: NodeRecord, b: NodeRecord): number {
  return a.title.localeCompare(b.title)
}

function isWorkflowInProgress(node: NodeRecord): boolean {
  if (!node.workflow_stage) return false
  return node.stage_status.execute !== 'complete'
}

function isStaleLeaf(node: NodeRecord, now: Date): boolean {
  if (node.pm_status !== 'active') return false
  if (node.last_visited_at === null) return true
  return now.getTime() - Date.parse(node.last_visited_at) > STALE_MS
}

export function pickAttentionModule(nodes: NodeRecord[], projectId: string, now: Date = new Date()): NodeRecord | null {
  const leaves = leafModulesOf(nodes, projectId)
  const groups: NodeRecord[][] = [
    leaves.filter((node) => node.break_glass?.used && node.workflow_stage === 'execute'),
    leaves.filter((node) => node.health === 'blocked'),
    [...leaves.filter(isWorkflowInProgress)].sort((a, b) => {
      const stageDelta = stageIndex(a.workflow_stage ?? 'review') - stageIndex(b.workflow_stage ?? 'review')
      return stageDelta !== 0 ? stageDelta : byTitle(a, b)
    }),
    leaves.filter((node) => isStaleLeaf(node, now)),
    leaves.filter((node) => node.health === 'at_risk' || node.health === 'stalled'),
  ]

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index] ?? []
    if (group.length === 0) continue
    if (index === 2) return group[0] ?? null
    return [...group].sort(byTitle)[0] ?? null
  }
  return null
}

export type DomainGroup = {
  domain: NodeRecord | null
  label: string
  projects: NodeRecord[]
}

export function groupByDomain(nodes: NodeRecord[], projects: NodeRecord[]): DomainGroup[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const groups = new Map<string, DomainGroup>()

  for (const project of projects) {
    const parent = project.parent_id ? byId.get(project.parent_id) ?? null : null
    const domain = parent?.kind === 'domain' ? parent : null
    const key = domain?.id ?? 'uncategorized'
    const existing = groups.get(key)
    if (existing) {
      existing.projects.push(project)
    } else {
      groups.set(key, {
        domain,
        label: domain?.title ?? 'Uncategorized',
        projects: [project],
      })
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    projects: [...group.projects].sort(byTitle),
  }))
}

export type StatusSectionId = 'active' | 'paused' | 'idea' | 'done'

export type StatusSection = {
  id: StatusSectionId
  label: string
  collapsed: boolean
  projects: NodeRecord[]
}

const STATUS_ORDER: { id: StatusSectionId; label: string; collapsed: boolean; match: (status: PmStatus) => boolean }[] = [
  { id: 'active', label: 'Active', collapsed: false, match: (status) => status === 'active' },
  { id: 'paused', label: 'Paused', collapsed: true, match: (status) => status === 'paused' },
  { id: 'idea', label: 'Ideas', collapsed: true, match: (status) => status === 'idea' },
  { id: 'done', label: 'Done / Archived', collapsed: true, match: (status) => status === 'done' || status === 'archived' },
]

export function portfolioStatusSections(nodes: NodeRecord[]): StatusSection[] {
  const projects = listProjects(nodes)
  return STATUS_ORDER.map((section) => ({
    id: section.id,
    label: section.label,
    collapsed: section.collapsed,
    projects: projects.filter((project) => section.match(project.pm_status)).sort(byTitle),
  }))
}
