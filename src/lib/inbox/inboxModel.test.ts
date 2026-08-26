import { describe, expect, it } from 'vitest'
import { getInboxId, INBOX_LIST_CAP, listInboxItems } from './inboxModel'
import { LIFE_PM_DEFAULTS } from '@/lib/life-pm/types'
import type { NodeRecord } from '@/types'

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

describe('inboxModel', () => {
  const home = node({ id: 'home', title: 'Main', parent_id: null })
  const inbox = node({ id: 'inbox', title: 'Inbox', parent_id: 'home', system_role: 'inbox', sort_order: -1 })

  it('finds the inbox id', () => {
    expect(getInboxId([home, inbox])).toBe('inbox')
  })

  it('lists incomplete inbox children oldest first with a cap and overflow count', () => {
    const children = Array.from({ length: INBOX_LIST_CAP + 2 }, (_, index) =>
      node({
        id: `item-${index}`,
        title: `Item ${index}`,
        parent_id: 'inbox',
        created_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    )

    const result = listInboxItems([home, inbox, ...children], 'inbox')

    expect(result.items).toHaveLength(INBOX_LIST_CAP)
    expect(result.overflow).toBe(2)
    expect(result.items[0]?.title).toBe('Item 0')
  })

  it('hides completed inbox children', () => {
    const result = listInboxItems(
      [
        home,
        inbox,
        node({ id: 'open', title: 'Open', parent_id: 'inbox' }),
        node({ id: 'done', title: 'Done', parent_id: 'inbox', completed: true }),
      ],
      'inbox',
    )

    expect(result.items.map((item) => item.title)).toEqual(['Open'])
  })
})