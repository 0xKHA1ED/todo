import { STAGE_CHECKLISTS, STAGE_ORDER, STAGE_SECTIONS, type WorkflowStage } from './types'
import type { NodeRecord } from '@/types'

type ChecklistRequirement = {
  heading: string
  minItems?: number
}

const LABEL_REQUIREMENTS: Record<string, ChecklistRequirement> = {
  'Problem statement': { heading: 'Problem statement' },
  Who: { heading: 'Who' },
  Pain: { heading: 'Pain' },
  'Why now': { heading: 'Why now' },
  Constraints: { heading: 'Constraints', minItems: 1 },
  'Not solving (min 2)': { heading: 'Not solving', minItems: 2 },
  'Options (min 3)': { heading: 'Options', minItems: 3 },
  Tradeoffs: { heading: 'Tradeoffs' },
  Killed: { heading: 'Killed', minItems: 1 },
  'Chosen direction': { heading: 'Chosen direction' },
  Approach: { heading: 'Approach' },
  Phases: { heading: 'Phases', minItems: 1 },
  Dependencies: { heading: 'Dependencies' },
  Risks: { heading: 'Risks', minItems: 1 },
  'Non-goals': { heading: 'Non-goals' },
  Requirements: { heading: 'Requirements' },
  'Acceptance criteria (min 3)': { heading: 'Acceptance criteria', minItems: 3 },
  'Edge cases (min 2)': { heading: 'Edge cases', minItems: 2 },
  'Verification plan': { heading: 'Verification plan' },
  'Tasks documented': { heading: 'Tasks' },
  'Each task has definition of done': { heading: 'Tasks' },
  'Tasks linked to spec criteria (where applicable)': { heading: 'Tasks' },
  'Problem revisited': { heading: 'Problem revisited' },
  Surprises: { heading: 'Surprises' },
  Learnings: { heading: 'Learnings' },
}

function htmlText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isStageDocEmpty(html: string | undefined): boolean {
  if (!html) return true
  const withoutHeadings = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ')
  return htmlText(withoutHeadings).length === 0
}

export function emptyStageHtml(stage: WorkflowStage): string {
  return STAGE_SECTIONS[stage].map((heading) => `<h2>${heading}</h2><p></p>`).join('')
}

export function ensureStageDoc(html: string | undefined, stage: WorkflowStage): string {
  return isStageDocEmpty(html) ? emptyStageHtml(stage) : (html as string)
}

export function needsStageTemplate(html: string | undefined): boolean {
  return !/<h2[\s>]/i.test(html ?? '')
}

export function stageHasContent(node: NodeRecord, stage: WorkflowStage): boolean {
  if (node.stage_status[stage] === 'complete') return true
  return !isStageDocEmpty(node.stage_docs[stage])
}

function headingSection(html: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<h2[^>]*>\\s*${escaped}\\s*</h2>([\\s\\S]*?)(?=<h2|$)`, 'i'))
  return match?.[1] ?? ''
}

function countStructuredItems(html: string): number {
  const listItems =
    html.match(/<li[\s>][\s\S]*?<\/li>/gi)?.filter((item) => htmlText(item).length > 0).length ?? 0
  if (listItems > 0) return listItems
  return html.match(/<p[\s>][\s\S]*?<\/p>/gi)?.filter((paragraph) => htmlText(paragraph).length > 0).length ?? 0
}

export function headingHasContent(html: string, heading: string): boolean {
  return htmlText(headingSection(html, heading)).length > 0
}

export function checklistHeadingForLabel(label: string): string {
  return LABEL_REQUIREMENTS[label]?.heading ?? label
}

function checklistRequirementMet(html: string, label: string): boolean {
  const requirement = LABEL_REQUIREMENTS[label] ?? { heading: label }
  const section = headingSection(html, requirement.heading)
  if (htmlText(section).length === 0) return false
  if (!requirement.minItems) return true
  return countStructuredItems(section) >= requirement.minItems
}

export function checklistState(node: NodeRecord, stage: WorkflowStage): { label: string; checked: boolean }[] {
  const html = node.stage_docs[stage] ?? ''
  const complete = node.stage_status[stage] === 'complete'
  return STAGE_CHECKLISTS[stage].map((label) => {
    if (complete || label === 'Sign-off' && node.stage_status[stage] === 'complete') {
      return { label, checked: true }
    }
    if (label === 'Sign-off') return { label, checked: false }
    return { label, checked: checklistRequirementMet(html, label) }
  })
}

export function stageChecklistReady(node: NodeRecord, stage: WorkflowStage): boolean {
  if (node.stage_status[stage] === 'complete') return true
  return checklistState(node, stage).every((item) => item.label === 'Sign-off' || item.checked)
}

export function ancestorContext(node: NodeRecord, nodes: NodeRecord[]): { domain: string; project: string } {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]))
  let domain = 'Uncategorized'
  let project = node.kind === 'project' ? node.title : node.title
  let currentId = node.parent_id
  while (currentId) {
    const parent = byId.get(currentId)
    if (!parent) break
    if (parent.kind === 'project') project = parent.title
    if (parent.kind === 'domain') domain = parent.title
    currentId = parent.parent_id
  }
  if (node.kind === 'project') project = node.title
  return { domain, project }
}

export function lockedDecisionLines(node: NodeRecord): string[] {
  return node.decisions.map((entry) => `${entry.date} — ${entry.text}`)
}

export function priorSummaries(node: NodeRecord, current: WorkflowStage) {
  const currentIndex = STAGE_ORDER.indexOf(current)
  return (Object.entries(node.stage_summaries) as [WorkflowStage, string][])
    .filter(([stage, summary]) => STAGE_ORDER.indexOf(stage) < currentIndex && summary)
    .sort((a, b) => STAGE_ORDER.indexOf(a[0]) - STAGE_ORDER.indexOf(b[0]))
    .map(([stage, summary]) => ({ stage, summary }))
}

export function seedFromNode(node: NodeRecord): string {
  const current = node.workflow_stage ?? 'problem'
  const fromDoc = htmlText(node.stage_docs[current] ?? '')
  if (fromDoc) return fromDoc.slice(0, 280)
  if (node.outcome.trim()) return node.outcome.trim()
  return node.title
}

export { STAGE_SECTIONS }
