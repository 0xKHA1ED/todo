import { describe, expect, it } from 'vitest'
import { rankNow } from './placeModel'
import type { NodeRecord, Urgency } from '@/types'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user',
    parent_id: 'home',
    completed: false,
    urgency: 'normal' as Urgency,
    date: null,
    tags: [],
    description: '',
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    ...partial,
  }
}

const today = new Date(2026, 7, 18) // 18 Aug 2026 local

const home = node({ id: 'home', title: 'Main', parent_id: null })

describe('rankNow', () => {
  it('orders overdue, today, next 7 days, then high-with-no-date, and caps at 5', () => {
    const nodes = [
      home,
      node({ id: 'a', title: 'Overdue', date: '2026-08-10', sort_order: 1 }),
      node({ id: 'b', title: 'Today', date: '2026-08-18', sort_order: 2 }),
      node({ id: 'c', title: 'This week', date: '2026-08-21', sort_order: 3 }),
      node({ id: 'd', title: 'High undated', urgency: 'high', sort_order: 4 }),
      node({ id: 'e', title: 'Also overdue', date: '2026-08-01', sort_order: 5 }),
      node({ id: 'f', title: 'Second high', urgency: 'high', sort_order: 6 }),
      node({ id: 'g', title: 'Someday', sort_order: 7 }),
      node({ id: 'done', title: 'Done today', date: '2026-08-18', completed: true, sort_order: 8 }),
    ]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.title)).toEqual([
      'Also overdue',
      'Overdue',
      'Today',
      'This week',
      'High undated',
    ])
    expect(result.overflow).toBe(1)
  })

  it('does not include the place node itself', () => {
    const nodes = [home, node({ id: 'child', title: 'Child', date: '2026-08-18' })]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.id)).toEqual(['child'])
  })

  it('includes nested descendants of the current place', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'bill', title: 'Pay ads', parent_id: 'biz', date: '2026-08-18' }),
    ]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.title)).toEqual(['Pay ads'])
  })
})
