import { describe, expect, it } from 'vitest'
import { LIFE_PM_DEFAULTS, STAGE_SECTIONS } from './types'
import type { NodeRecord } from '@/types'
import {
  emptyStageHtml,
  ensureStageDoc,
  isStageDocEmpty,
  stageChecklistReady,
} from './stageContent'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user',
    parent_id: 'home',
    system_role: null,
    completed: false,
    urgency: 'normal',
    date: null,
    tags: [],
    description: '',
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    ...LIFE_PM_DEFAULTS,
    ...partial,
  }
}

describe('emptyStageHtml', () => {
  it('seeds every required heading so a blank think screen is fill-in-the-blanks', () => {
    const html = emptyStageHtml('problem')
    for (const heading of STAGE_SECTIONS.problem) {
      expect(html).toContain(`<h2>${heading}</h2>`)
    }
  })

  it('does not count as ready — empty placeholders are not content', () => {
    const html = emptyStageHtml('problem')
    expect(isStageDocEmpty(html)).toBe(true)
    expect(
      stageChecklistReady(
        node({ id: 'mod', title: 'Token', kind: 'module', workflow_stage: 'problem', stage_docs: { problem: html } }),
        'problem',
      ),
    ).toBe(false)
  })
})

describe('ensureStageDoc', () => {
  it('replaces blank editors with the stage template and keeps real notes', () => {
    expect(ensureStageDoc('', 'shape')).toBe(emptyStageHtml('shape'))
    expect(ensureStageDoc('<p></p>', 'shape')).toBe(emptyStageHtml('shape'))
    expect(ensureStageDoc('<h2>Options</h2><p>Cookies.</p>', 'shape')).toBe('<h2>Options</h2><p>Cookies.</p>')
  })
})

describe('checklist min counts', () => {
  it('ignores empty list items so a seeded template cannot cheat the gate', () => {
    const html =
      emptyStageHtml('problem').replace(
        '<h2>Not solving</h2><p></p>',
        '<h2>Not solving</h2><ul><li></li><li></li></ul>',
      )
    expect(
      stageChecklistReady(
        node({ id: 'mod', title: 'Token', kind: 'module', workflow_stage: 'problem', stage_docs: { problem: html } }),
        'problem',
      ),
    ).toBe(false)
  })
})
