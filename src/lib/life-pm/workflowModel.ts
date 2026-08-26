import type { NodeRecord } from '@/types'
import { stageHasContent } from './stageContent'
import type { NodeKind, StageStatusMap, TrafficLight, WorkflowStage } from './types'
import { STAGE_ORDER } from './types'

export { STAGE_ORDER } from './types'

export function stageIndex(stage: WorkflowStage): number {
  return STAGE_ORDER.indexOf(stage)
}

export function nextStage(stage: WorkflowStage): WorkflowStage | null {
  const index = stageIndex(stage)
  if (index < 0 || index >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[index + 1] ?? null
}

export function hasChildModules(nodes: NodeRecord[], nodeId: string): boolean {
  return nodes.some((candidate) => candidate.parent_id === nodeId && candidate.kind === 'module')
}

export function isWorkflowLeaf(node: NodeRecord, nodes: NodeRecord[]): boolean {
  if (node.system_role === 'inbox' || node.parent_id === null) return false
  if (node.kind !== 'project' && node.kind !== 'module') return false
  return !hasChildModules(nodes, node.id)
}

export function isContainer(node: NodeRecord, nodes: NodeRecord[]): boolean {
  if (node.kind === 'domain') return true
  if (node.kind === 'project' || node.kind === 'module') return hasChildModules(nodes, node.id)
  return false
}

export function canEditStage(node: NodeRecord, stage: WorkflowStage): boolean {
  return node.workflow_stage === stage
}

export function canCreateTask(parent: NodeRecord, nodes: NodeRecord[]): boolean {
  if (parent.system_role === 'inbox') return true
  if (parent.kind === 'task' || parent.kind === 'domain' || parent.parent_id === null) return false
  if (hasChildModules(nodes, parent.id)) return false
  if (parent.kind !== 'project' && parent.kind !== 'module') return false
  return parent.workflow_stage === 'execute'
}

export function canSkipReview(node: NodeRecord): boolean {
  return node.kind === 'module'
}

export function childTasks(parentId: string, nodes: NodeRecord[]): NodeRecord[] {
  return nodes.filter(
    (candidate) =>
      candidate.parent_id === parentId &&
      (candidate.kind === 'task' || candidate.kind == null) &&
      candidate.system_role !== 'inbox',
  )
}

export function canSignOff(node: NodeRecord, nodes: NodeRecord[]): boolean {
  if (!isWorkflowLeaf(node, nodes)) return false
  const stage = node.workflow_stage
  if (!stage) return false
  if (stage === 'execute') return childTasks(node.id, nodes).every((task) => task.completed)
  return stageHasContent(node, stage)
}

export function isStageLocked(stage: WorkflowStage, current: WorkflowStage | null): boolean {
  if (!current) return stage !== 'problem'
  return stageIndex(stage) > stageIndex(current)
}

export function trafficLight(
  stage: WorkflowStage,
  workflowStage: WorkflowStage | null,
  stageStatus: StageStatusMap,
): TrafficLight {
  const status = stageStatus[stage]
  if (status === 'complete') return 'complete'
  if (isStageLocked(stage, workflowStage)) return 'locked'
  if (status === 'in_progress') return 'in_progress'
  if (workflowStage === stage && !status) return 'not_started'
  if (status === 'not_started') return 'not_started'
  return 'not_started'
}

export function allowedChildKinds(parent: NodeRecord, nodes: NodeRecord[]): NodeKind[] {
  if (parent.parent_id === null) return ['project', 'domain']
  if (parent.system_role === 'inbox') return ['task']
  if (parent.kind === 'domain') return ['project']
  if (parent.kind === 'project') {
    const kinds: NodeKind[] = ['module']
    if (canCreateTask(parent, nodes)) kinds.push('task')
    return kinds
  }
  if (parent.kind === 'module') {
    const kinds: NodeKind[] = ['module']
    if (canCreateTask(parent, nodes)) kinds.push('task')
    return kinds
  }
  return []
}

export function validateChildKind(parent: NodeRecord, childKind: NodeKind, nodes: NodeRecord[]): string | null {
  const allowed = allowedChildKinds(parent, nodes)
  if (!allowed.includes(childKind)) {
    if (childKind === 'task' && (parent.kind === 'project' || parent.kind === 'module') && parent.workflow_stage !== 'execute') {
      return 'Tasks unlock in Execute. Finish the earlier stages first, or use emergency skip.'
    }
    return `Cannot create a ${childKind} under ${parent.kind ?? 'this node'}.`
  }
  return null
}

export function defaultKindForParent(parent: NodeRecord, nodes: NodeRecord[]): NodeKind {
  const allowed = allowedChildKinds(parent, nodes)
  return allowed[0] ?? 'task'
}

export function resolveViewMode(node: NodeRecord | null, nodes: NodeRecord[]): import('./types').ViewMode {
  if (!node || node.parent_id === null) return 'portfolio'
  if (node.system_role === 'inbox') return 'list'
  if (isContainer(node, nodes) || node.kind === 'domain') return 'hub'
  if ((node.kind === 'project' || node.kind === 'module') && node.workflow_stage === 'execute') return 'list'
  if (node.kind === 'project' || node.kind === 'module') return 'think'
  return 'map'
}

export function isViewModeAllowed(
  mode: import('./types').ViewMode,
  node: NodeRecord | null,
  nodes: NodeRecord[],
): boolean {
  if (!node || node.parent_id === null) return mode === 'portfolio'
  if (node.system_role === 'inbox') return mode === 'list' || mode === 'map'
  if (isContainer(node, nodes) || node.kind === 'domain') return mode === 'hub'
  if (node.kind === 'project' || node.kind === 'module') return mode === 'think' || mode === 'map' || mode === 'list'
  return mode === 'map' || mode === 'list'
}
