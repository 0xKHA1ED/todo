import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCursorPrompt } from './buildCursorPrompt'

function golden(name: string) {
  return readFileSync(resolve(process.cwd(), 'docs/life-pm/examples', name), 'utf8')
}

describe('buildCursorPrompt', () => {
  it('matches the session-prompt-problem.md structure', () => {
    const output = buildCursorPrompt({
      moduleId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      module: 'Token refresh',
      project: 'Auth refactor',
      domain: 'IMS',
      stage: 'problem',
      workflowStageStatus: 'in_progress',
      priorSummaries: [],
      lockedDecisions: [],
      openQuestions: [],
      checklist: [
        { label: 'Problem statement', checked: false },
        { label: 'Who', checked: false },
        { label: 'Pain', checked: false },
        { label: 'Why now', checked: false },
        { label: 'Constraints', checked: false },
        { label: 'Not solving (min 2)', checked: false },
        { label: 'Sign-off', checked: false },
      ],
      seedContent: 'Mobile users lose sessions silently mid-checkout',
    })

    const expected = golden('session-prompt-problem.md').trim()
    expect(output.trim()).toBe(expected)
  })
})
