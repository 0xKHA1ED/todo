import { describe, expect, it } from 'vitest'
import { countChecklistItems, parseChecklistProgress } from './checklistProgress'

const emptyDoc = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
})

const checklistDoc = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Also open' }],
            },
            {
              type: 'taskList',
              content: [
                {
                  type: 'taskItem',
                  attrs: { checked: true },
                  content: [{ type: 'paragraph' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

describe('parseChecklistProgress', () => {
  it('returns zeros for empty or invalid content', () => {
    expect(parseChecklistProgress('')).toEqual({ total: 0, completed: 0 })
    expect(parseChecklistProgress(emptyDoc)).toEqual({ total: 0, completed: 0 })
    expect(parseChecklistProgress('not json')).toEqual({ total: 0, completed: 0 })
  })

  it('counts task items in nested task lists', () => {
    expect(parseChecklistProgress(checklistDoc)).toEqual({ total: 4, completed: 2 })
  })

  it('counts multiple task lists in one document', () => {
    const doc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] }],
        },
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] }],
        },
      ],
    })

    expect(parseChecklistProgress(doc)).toEqual({ total: 2, completed: 1 })
  })
})

describe('countChecklistItems', () => {
  it('counts task items directly from a parsed TipTap document object', () => {
    const doc = JSON.parse(checklistDoc)
    expect(countChecklistItems(doc)).toEqual({ total: 4, completed: 2 })
  })

  it('returns zeros for nullish or non-object input', () => {
    expect(countChecklistItems(undefined)).toEqual({ total: 0, completed: 0 })
    expect(countChecklistItems(null)).toEqual({ total: 0, completed: 0 })
    expect(countChecklistItems('not an object')).toEqual({ total: 0, completed: 0 })
  })

  it('agrees with parseChecklistProgress on the same document', () => {
    expect(countChecklistItems(JSON.parse(checklistDoc))).toEqual(parseChecklistProgress(checklistDoc))
  })
})