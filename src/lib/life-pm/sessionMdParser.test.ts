import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSessionExport } from './sessionMdParser'

function golden(name: string) {
  return readFileSync(resolve(process.cwd(), 'docs/life-pm/examples', name), 'utf8')
}

describe('parseSessionExport', () => {
  it('round-trips session-export-problem-complete.md', () => {
    const result = parseSessionExport(golden('session-export-problem-complete.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.moduleId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.value.stage).toBe('problem')
    expect(result.value.status).toBe('complete')
    expect(result.value.signOff).toBe(true)
    expect(result.value.sections['Problem statement']).toContain('authenticated session')
    expect(result.value.sections['Not solving']).toContain('OAuth')
    expect(result.value.lockedDecisions).toHaveLength(1)
    expect(result.value.openQuestions).toEqual([])
    expect(result.value.checklist.every((item) => item.checked)).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it('round-trips session-export-spec.md', () => {
    const result = parseSessionExport(golden('session-export-spec.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stage).toBe('spec')
    expect(result.value.status).toBe('in_progress')
    expect(result.value.signOff).toBe(false)
    expect(result.value.sections['Acceptance criteria']).toContain('mobile Safari')
    expect(result.value.lockedDecisions).toHaveLength(2)
    expect(result.value.openQuestions).toHaveLength(1)
    expect(result.value.checklist.find((item) => item.label === 'Sign-off')?.checked).toBe(false)
  })

  it('round-trips session-export-problem-in-progress.md', () => {
    const result = parseSessionExport(golden('session-export-problem-in-progress.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('in_progress')
    expect(result.value.openQuestions).toHaveLength(2)
    expect(result.value.lockedDecisions).toEqual([])
  })

  it('returns structured errors for invalid markdown', () => {
    const result = parseSessionExport('not a session export')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toMatch(/frontmatter|YAML|life_pm_format/i)
  })

  it('errors when required stage sections are missing', () => {
    const md = `---
life_pm_format: "1.0"
type: session_export
module_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
module: Token refresh
project: Auth refactor
domain: IMS
stage: problem
status: in_progress
session_date: 2026-08-26
sign_off: false
---

## Summary

Only a summary.

## Locked decisions

- (none)

## Open questions

- (none)

## Stage checklist

- [ ] Problem statement
`
    const result = parseSessionExport(md)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => /Problem statement/i.test(error))).toBe(true)
  })

  it('downgrades complete status when the checklist is incomplete', () => {
    const md = golden('session-export-problem-complete.md').replace('status: complete', 'status: complete').replace(
      '- [x] Sign-off',
      '- [ ] Sign-off',
    )
    const result = parseSessionExport(md)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('in_progress')
    expect(result.warnings.some((warning) => /checklist/i.test(warning))).toBe(true)
  })

  it('downgrades complete status when required section content is incomplete', () => {
    const md = golden('session-export-problem-complete.md').replace(
      '## Not solving\n\n- OAuth provider migration (Google/Apple sign-in)\n- Admin panel session management\n- Native iOS/Android app auth (separate codebase)',
      '## Not solving\n\n- OAuth provider migration (Google/Apple sign-in)',
    )
    const result = parseSessionExport(md)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('in_progress')
    expect(result.warnings.some((warning) => /required content/i.test(warning))).toBe(true)
  })
})
