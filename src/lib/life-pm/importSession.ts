import type { DecisionLogEntry, NodeRecord, StageDocsMap, StageStatusMap, StageSummariesMap } from '@/types'
import { STAGE_SECTIONS } from './types'
import { sectionsToHtml } from './markdownToHtml'
import { parseSessionExport, type ParseResult } from './sessionMdParser'

function parseDecision(bullet: string, fallbackDate: string): DecisionLogEntry {
  const match = bullet.match(/^(\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.+)$/)
  if (match?.[1] && match[2]) return { date: match[1], text: match[2].trim() }
  return { date: fallbackDate, text: bullet }
}

export function mergeImportedSession(node: NodeRecord, rawMd: string): ParseResult & { patch?: Partial<NodeRecord> } {
  const parsed = parseSessionExport(rawMd)
  if (!parsed.ok) return parsed

  const { value, warnings } = parsed
  const extraWarnings = [...warnings]
  if (value.moduleId !== node.id) {
    extraWarnings.push(`Export module_id ${value.moduleId} does not match this node`)
  }

  const stage = value.stage
  const html = sectionsToHtml(value.sections, STAGE_SECTIONS[stage])
  const existingTexts = new Set(node.decisions.map((entry) => entry.text))
  const incoming = value.lockedDecisions
    .map((bullet) => parseDecision(bullet, value.sessionDate))
    .filter((entry) => {
      if (existingTexts.has(entry.text)) return false
      existingTexts.add(entry.text)
      return true
    })

  const stage_docs: StageDocsMap = { ...node.stage_docs, [stage]: html }
  const stage_summaries: StageSummariesMap = {
    ...node.stage_summaries,
    ...(value.summary ? { [stage]: value.summary } : {}),
  }
  const stage_status: StageStatusMap = { ...node.stage_status, [stage]: value.status }

  return {
    ok: true,
    warnings: extraWarnings,
    value,
    patch: {
      stage_docs,
      stage_summaries,
      stage_status,
      decisions: [...node.decisions, ...incoming],
      open_questions: value.openQuestions,
    },
  }
}
