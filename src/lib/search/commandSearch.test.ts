import { describe, expect, it } from 'vitest'
import { COMMAND_SEARCH_LIMIT, searchCommandNodes } from './commandSearch'
import { defaultEditorContent } from '@/lib/utils'
import type { NodeRecord } from '@/types'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'u',
    parent_id: 'home',
    system_role: null,
    completed: false,
    urgency: 'normal',
    date: null,
    tags: [],
    description: defaultEditorContent(),
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    ...partial,
  }
}

function descriptionWith(text: string) {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  })
}

const home = node({ id: 'home', title: 'Main', parent_id: null })

describe('searchCommandNodes', () => {
  it('excludes the root node and returns every non-root node when the query is blank', () => {
    const nodes = [home, node({ id: 'a', title: 'Alpha' }), node({ id: 'b', title: 'Beta' })]
    const results = searchCommandNodes(nodes, '   ')
    expect(results.map((result) => result.title)).toEqual(['Alpha', 'Beta'])
  })

  it('matches on title, description text, and tags case-insensitively', () => {
    const nodes = [
      home,
      node({ id: 'title', title: 'Bank Form' }),
      node({ id: 'desc', title: 'Notes', description: descriptionWith('remember the PASSPORT') }),
      node({ id: 'tag', title: 'Groceries', tags: ['Errands'] }),
      node({ id: 'miss', title: 'Unrelated' }),
    ]

    expect(searchCommandNodes(nodes, 'bank').map((r) => r.id)).toEqual(['title'])
    expect(searchCommandNodes(nodes, 'passport').map((r) => r.id)).toEqual(['desc'])
    expect(searchCommandNodes(nodes, 'errands').map((r) => r.id)).toEqual(['tag'])
    expect(searchCommandNodes(nodes, 'zzz')).toHaveLength(0)
  })

  it('truncates the description preview to 120 characters', () => {
    const long = 'x'.repeat(200)
    const results = searchCommandNodes([home, node({ id: 'a', title: 'Long', description: descriptionWith(long) })], '')
    expect(results[0]?.descriptionPreview).toHaveLength(120)
  })

  it('caps the number of results at COMMAND_SEARCH_LIMIT', () => {
    const many = Array.from({ length: COMMAND_SEARCH_LIMIT + 5 }, (_, index) =>
      node({ id: `n${index}`, title: `Task ${index}` }),
    )
    expect(searchCommandNodes([home, ...many], '')).toHaveLength(COMMAND_SEARCH_LIMIT)
  })
})
