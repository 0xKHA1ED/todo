import { describe, expect, it } from 'vitest'
import { parseChecklistProgress } from './checklistProgress'

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