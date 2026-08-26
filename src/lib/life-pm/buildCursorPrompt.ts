import type { StageStatus, WorkflowStage } from './types'
import { STAGE_CHECKLISTS } from './types'

export type CursorPromptInput = {
  moduleId: string
  module: string
  project: string
  domain: string
  stage: WorkflowStage
  workflowStageStatus: StageStatus
  priorSummaries: { stage: WorkflowStage; summary: string }[]
  lockedDecisions: string[]
  openQuestions: string[]
  checklist: { label: string; checked: boolean }[]
  seedContent?: string
}

function bullets(items: string[], empty: string): string {
  if (items.length === 0) return `- ${empty}`
  return items.map((item) => `- ${item}`).join('\n')
}

function checklistMarkdown(items: { label: string; checked: boolean }[], stage: WorkflowStage): string {
  const labels = items.length > 0 ? items : (STAGE_CHECKLISTS[stage] ?? []).map((label) => ({ label, checked: false }))
  return labels.map((item) => `- [${item.checked ? 'x' : ' '}] ${item.label}`).join('\n')
}

export function buildCursorPrompt(input: CursorPromptInput): string {
  const prior =
    input.priorSummaries.length === 0
      ? '- (none — first session)'
      : input.priorSummaries.map((item) => `- **${item.stage}:** ${item.summary}`).join('\n')

  const seed = input.seedContent?.trim()
    ? `> ${input.seedContent.trim()}`
    : '- (none)'

  return `---
life_pm_format: "1.0"
type: session_prompt
module_id: ${input.moduleId}
module: ${input.module}
project: ${input.project}
domain: ${input.domain}
stage: ${input.stage}
workflow_stage_status: ${input.workflowStageStatus}
---

# Life PM session

## Prior summaries

${prior}

## Locked decisions

${bullets(input.lockedDecisions, '(none)')}

## Open questions

${bullets(input.openQuestions, '(none)')}

## Stage checklist

${checklistMarkdown(input.checklist, input.stage)}

## Seed content

${seed}

---

Facilitate the **${input.stage}** stage. Follow life-pm skill rules. End session with a \`session_export\` MD block per \`docs/life-pm/session-md-format.md\`.
`
}
