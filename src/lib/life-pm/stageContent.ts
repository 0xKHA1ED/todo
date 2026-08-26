import { STAGE_CHECKLISTS, STAGE_ORDER, STAGE_SECTIONS, type WorkflowStage } from './types'
import type { NodeRecord } from '@/types'

const LABEL_TO_HEADING: Record<string, string> = {
  'Problem statement': 'Problem statement',
  Who: 'Who',
  Pain: 'Pain',
  'Why now': 'Why now',
  Constraints: 'Constraints',
  'Not solving (min 2)': 'Not solving',
  'Options (min 3)': 'Options',
  Tradeoffs: 'Tradeoffs',
  Killed: 'Killed',
  'Chosen direction': 'Chosen direction',
  Approach: 'Approach',
  Phases: 'Phases',
  Dependencies: 'Dependencies',
  Risks: 'Risks',
  'Non-goals': 'Non-goals',
  Requirements: 'Requirements',
  'Acceptance criteria (min 3)': 'Acceptance criteria',
  'Edge cases (min 2)': 'Edge cases',
  'Verification plan': 'Verification plan',
  'Tasks documented': 'Tasks',
  'Each task has definition of done': 'Tasks',
  'Tasks linked to spec criteria (where applicable)': 'Tasks',
  'Problem revisited': 'Problem revisited',
  Surprises: 'Surprises',
  Learnings: 'Learnings',
}

function htmlText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function stageHasContent(node: NodeRecord, stage: WorkflowStage): boolean {
  if (node.stage_status[stage] === 'complete') return true
  return htmlText(node.stage_docs[stage] ?? '').length > 0
}

export function headingHasContent(html: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<h2[^>]*>\\s*${escaped}\\s*</h2>([\\s\\S]*?)(?=<h2|$)`, 'i'))
  if (!match) return false
  return htmlText(match[1] ?? '').length > 0
}

export function checklistState(node: NodeRecord, stage: WorkflowStage): { label: string; checked: boolean }[] {
  const html = node.stage_docs[stage] ?? ''
  const complete = node.stage_status[stage] === 'complete'
  return STAGE_CHECKLISTS[stage].map((label) => {
    if (complete || label === 'Sign-off' && node.stage_status[stage] === 'complete') {
      return { label, checked: true }
    }
    if (label === 'Sign-off') return { label, checked: false }
    const heading = LABEL_TO_HEADING[label] ?? label
    return { label, checked: headingHasContent(html, heading) }
  })
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
