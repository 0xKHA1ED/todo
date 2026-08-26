import type { NodeRecord } from '@/types'
import { buildCursorPrompt } from './buildCursorPrompt'
import { ancestorContext, checklistState, lockedDecisionLines, priorSummaries, seedFromNode } from './stageContent'

export function buildCursorPromptForNode(node: NodeRecord, nodes: NodeRecord[]): string {
  const stage = node.workflow_stage ?? 'problem'
  const { domain, project } = ancestorContext(node, nodes)
  return buildCursorPrompt({
    moduleId: node.id,
    module: node.title,
    project,
    domain,
    stage,
    workflowStageStatus: node.stage_status[stage] ?? 'not_started',
    priorSummaries: priorSummaries(node, stage),
    lockedDecisions: lockedDecisionLines(node),
    openQuestions: node.open_questions,
    checklist: checklistState(node, stage),
    seedContent: seedFromNode(node),
  })
}
