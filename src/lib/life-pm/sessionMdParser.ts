import type { LifePmStatus, WorkflowStage } from './types'
import { META_SECTIONS, STAGE_CHECKLISTS, STAGE_SECTIONS, SUPPORTED_FORMAT_VERSIONS } from './types'
import { isUuid } from './markdownToHtml'

export type SessionExport = {
  lifePmFormat: '1.0'
  type: 'session_export'
  moduleId: string
  module: string
  project: string
  domain: string
  stage: WorkflowStage
  status: LifePmStatus
  sessionDate: string
  signOff: boolean
  summary?: string
  sections: Record<string, string>
  lockedDecisions: string[]
  openQuestions: string[]
  checklist: { label: string; checked: boolean }[]
}

export type ParseSuccess = { ok: true; value: SessionExport; warnings: string[] }
export type ParseFailure = { ok: false; errors: string[]; warnings: string[] }
export type ParseResult = ParseSuccess | ParseFailure

const STAGES: WorkflowStage[] = ['problem', 'shape', 'plan', 'spec', 'execute', 'review']
const STATUSES: LifePmStatus[] = ['not_started', 'in_progress', 'complete']

function parseYamlValue(raw: string): string | boolean {
  const trimmed = raw.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFrontmatter(raw: string): { fields: Record<string, string | boolean>; body: string } | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const fields: Record<string, string | boolean> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    fields[key] = parseYamlValue(line.slice(colon + 1))
  }
  return { fields, body: match[2] ?? '' }
}

function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const parts = body.split(/^## /m)
  for (const part of parts) {
    if (!part.trim()) continue
    const newline = part.indexOf('\n')
    const title = (newline === -1 ? part : part.slice(0, newline)).trim()
    const content = newline === -1 ? '' : part.slice(newline + 1).trim()
    sections[title] = content
  }
  return sections
}

function parseBullets(body: string | undefined): string[] {
  if (!body) return []
  const trimmed = body.trim()
  if (!trimmed || trimmed === '-' || /^\(none/i.test(trimmed)) return []
  return trimmed
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter((line) => line && !/^\(none/i.test(line))
}

function parseChecklist(body: string | undefined): { label: string; checked: boolean }[] {
  if (!body) return []
  const items: { label: string; checked: boolean }[] = []
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/)
    if (!match) continue
    items.push({ label: match[2]!.trim(), checked: match[1]!.toLowerCase() === 'x' })
  }
  return items
}

function asString(value: string | boolean | undefined): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return ''
}

export function parseSessionExport(raw: string): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const parsed = parseFrontmatter(raw.trim())
  if (!parsed) {
    return { ok: false, errors: ['Missing or invalid YAML frontmatter'], warnings }
  }

  const { fields, body } = parsed
  const format = asString(fields.life_pm_format)
  if (!SUPPORTED_FORMAT_VERSIONS.includes(format as (typeof SUPPORTED_FORMAT_VERSIONS)[number])) {
    errors.push(`Unsupported life_pm_format: ${format || '(missing)'}`)
  }
  if (fields.type !== 'session_export') {
    errors.push(`Expected type session_export, got ${asString(fields.type) || '(missing)'}`)
  }

  const moduleId = asString(fields.module_id)
  if (!isUuid(moduleId)) errors.push('module_id must be a UUID')

  const stage = asString(fields.stage) as WorkflowStage
  if (!STAGES.includes(stage)) errors.push(`Invalid stage: ${asString(fields.stage) || '(missing)'}`)

  let status = asString(fields.status) as LifePmStatus
  if (!STATUSES.includes(status)) errors.push(`Invalid status: ${asString(fields.status) || '(missing)'}`)

  const sessionDate = asString(fields.session_date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) errors.push('session_date must be YYYY-MM-DD')

  let signOff = fields.sign_off === true

  if (errors.length > 0) {
    return { ok: false, errors, warnings }
  }

  const sections = splitSections(body)
  const required = [...(STAGE_SECTIONS[stage] ?? []), ...META_SECTIONS]
  for (const title of required) {
    if (!(title in sections)) errors.push(`Missing required section: ${title}`)
  }

  const known = new Set(['Summary', ...required, ...META_SECTIONS, ...(STAGE_SECTIONS[stage] ?? [])])
  for (const title of Object.keys(sections)) {
    if (!known.has(title)) warnings.push(`Unknown section ignored: ${title}`)
  }

  const checklist = parseChecklist(sections['Stage checklist'])
  const expectedLabels = STAGE_CHECKLISTS[stage] ?? []
  const allRequiredChecked = expectedLabels.every((label) => checklist.find((item) => item.label === label)?.checked)
  const signOffChecked = checklist.find((item) => item.label === 'Sign-off')?.checked === true

  if (signOff && !signOffChecked) {
    warnings.push('sign_off is true but Sign-off is not checked; treating sign_off as false')
    signOff = false
  }

  if (status === 'complete' && !allRequiredChecked) {
    warnings.push('status is complete but checklist is incomplete; downgrading to in_progress')
    status = 'in_progress'
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings }
  }

  const summaryFromSection = sections.Summary?.split('\n')[0]?.trim()
  const summary = asString(fields.summary) || summaryFromSection || undefined

  return {
    ok: true,
    warnings,
    value: {
      lifePmFormat: '1.0',
      type: 'session_export',
      moduleId,
      module: asString(fields.module),
      project: asString(fields.project),
      domain: asString(fields.domain),
      stage,
      status,
      sessionDate,
      signOff,
      summary,
      sections,
      lockedDecisions: parseBullets(sections['Locked decisions']),
      openQuestions: parseBullets(sections['Open questions']),
      checklist,
    },
  }
}
