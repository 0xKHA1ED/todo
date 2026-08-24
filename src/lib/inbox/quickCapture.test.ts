import { describe, expect, it } from 'vitest'
import { parseQuickCaptureTitle } from './quickCapture'

describe('parseQuickCaptureTitle', () => {
  it('strips trailing hash tags from the title', () => {
    expect(parseQuickCaptureTitle('Bank form #errands #paperwork')).toEqual({
      title: 'Bank form',
      tags: ['errands', 'paperwork'],
    })
  })

  it('returns the full string when no tags exist', () => {
    expect(parseQuickCaptureTitle('  Call dentist  ')).toEqual({
      title: 'Call dentist',
      tags: [],
    })
  })

  it('deduplicates trailing tags case-insensitively', () => {
    expect(parseQuickCaptureTitle('Task #Errands #errands')).toEqual({
      title: 'Task',
      tags: ['Errands'],
    })
  })

  it('keeps non-trailing hash tokens in the title', () => {
    expect(parseQuickCaptureTitle('Call #bank tomorrow')).toEqual({
      title: 'Call #bank tomorrow',
      tags: [],
    })
  })
})