import { describe, expect, it } from 'vitest'
import { defaultEditorContent, formatDate, getPlainTextFromTipTap, parseTags } from './utils'

describe('parseTags', () => {
  it('splits, trims, and drops empty tokens', () => {
    expect(parseTags(' infra , code ,, urgent ')).toEqual(['infra', 'code', 'urgent'])
  })

  it('deduplicates exact repeats while preserving order', () => {
    expect(parseTags('code, code, infra')).toEqual(['code', 'infra'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags('   ,  , ')).toEqual([])
  })
})

describe('formatDate', () => {
  it('formats an ISO date as month and day', () => {
    expect(formatDate('2026-08-24')).toBe('Aug 24')
  })

  it('returns the original string when it cannot be parsed', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('getPlainTextFromTipTap', () => {
  it('returns an empty string for nullish input', () => {
    expect(getPlainTextFromTipTap(null)).toBe('')
    expect(getPlainTextFromTipTap(undefined)).toBe('')
    expect(getPlainTextFromTipTap('')).toBe('')
  })

  it('extracts and joins nested text nodes', () => {
    const doc = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'world' }] }],
            },
          ],
        },
      ],
    })

    expect(getPlainTextFromTipTap(doc)).toBe('Hello world')
  })

  it('falls back to the raw string when the content is not valid JSON', () => {
    expect(getPlainTextFromTipTap('plain notes')).toBe('plain notes')
  })
})

describe('defaultEditorContent', () => {
  it('produces a valid empty TipTap document', () => {
    expect(JSON.parse(defaultEditorContent())).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })
})
