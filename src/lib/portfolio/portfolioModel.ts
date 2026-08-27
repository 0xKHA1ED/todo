import { STALE_MS, subtreeDescendants } from '@/lib/place/placeModel'
import { hasChildModules, isWorkflowLeaf, stageIndex, trafficLight } from '@/lib/life-pm/workflowModel'
import type { NodeRecord, PmStatus, TrafficLight, WorkflowStage } from '@/types'

export function listProjects(nodes: NodeRecord[]): NodeRecord[] {
  return nodes.filter((node) => node.kind === 'project' && node.system_role == null)
}

function leafModulesOf(nodes: NodeRecord[], projectId: string): NodeRecord[] {
  return [nodes.find((node) => node.id === projectId), ...subtreeDescendants(nodes, projectId)].filter(
    (node): node is NodeRecord =>
      Boolean(node && node.kind === 'module' && isWorkflowLeaf(node, nodes) && !hasChildModules(nodes, node.id)),
  )
}

function workflowLeavesOfProject(nodes: NodeRecord[], projectId: string): NodeRecord[] {
  const project = nodes.find((node) => node.id === projectId) ?? null
  if (!project) return []
  if (isWorkflowLeaf(project, nodes)) return [project]
  return leafModulesOf(nodes, projectId)
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

export type ProjectStageIndicator = {
  stage: WorkflowStage
  light: TrafficLight
}

export function projectStageIndicator(nodes: NodeRecord[], projectId: string): ProjectStageIndicator | null {
  const leaves = workflowLeavesOfProject(nodes, projectId).filter((node) => node.workflow_stage)
  if (leaves.length === 0) return null

  const indicators = leaves.map((node) => {
    const stage = node.workflow_stage as WorkflowStage
    return {
      node,
      stage,
      light: trafficLight(stage, node.workflow_stage, node.stage_status),
    }
  })
  const active = indicators
    .filter((indicator) => indicator.light !== 'complete')
    .sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage) || byTitle(a.node, b.node))
  const complete = indicators.sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage) || byTitle(a.node, b.node))
  const picked = active[0] ?? complete[0]
  return picked ? { stage: picked.stage, light: picked.light } : null
}

export type DomainGroup = {
  domain: NodeRecord | null
  label: string
  projects: NodeRecord[]
}

export function listDomains(nodes: NodeRecord[]): NodeRecord[] {
  return nodes.filter((node) => node.kind === 'domain' && node.system_role == null).sort(byTitle)
}

export function groupByDomain(
  nodes: NodeRecord[],
  projects: NodeRecord[],
  options?: { includeEmptyDomains?: boolean },
): DomainGroup[] {
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

  if (options?.includeEmptyDomains) {
    for (const domain of listDomains(nodes)) {
      if (!groups.has(domain.id)) {
        groups.set(domain.id, { domain, label: domain.title, projects: [] })
      }
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      projects: [...group.projects].sort(byTitle),
    }))
    .sort((a, b) => {
      if (a.domain === null && b.domain !== null) return 1
      if (a.domain !== null && b.domain === null) return -1
      return a.label.localeCompare(b.label)
    })
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
