import { describe, expect, it } from 'vitest'
import { pickForgotten, rankNow, STALE_MS } from './placeModel'
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

describe('pickForgotten', () => {
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('prefers the oldest stale area over a stale leaf', () => {
    const nodes = [
      home,
      node({
        id: 'design',
        title: 'Design',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
      node({ id: 'logo', title: 'Logo', parent_id: 'design' }),
      node({
        id: 'undated-leaf',
        title: 'Someday leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS * 3).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set())
    expect(picked?.title).toBe('Design')
  })

  it('resurfaces a stale leaf when no stale area exists, skipping Now items', () => {
    const nodes = [
      home,
      node({
        id: 'in-now',
        title: 'Due leaf',
        date: '2026-08-18',
        last_visited_at: new Date(now.getTime() - STALE_MS * 2).toISOString(),
      }),
      node({
        id: 'stale',
        title: 'Forgotten leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set(['in-now']))
    expect(picked?.title).toBe('Forgotten leaf')
  })

  it('returns null when nothing is stale', () => {
    const nodes = [
      home,
      node({ id: 'fresh', title: 'Fresh', last_visited_at: now.toISOString() }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())).toBeNull()
  })

  it('treats null last_visited_at as stale', () => {
    const nodes = [
      home,
      node({ id: 'area', title: 'Health' }),
      node({ id: 'gym', title: 'Gym', parent_id: 'area' }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Health')
  })

  it('skips completed children', () => {
    const nodes = [
      home,
      node({
        id: 'done-area',
        title: 'Done area',
        completed: true,
        last_visited_at: null,
      }),
      node({ id: 'child', title: 'Child', parent_id: 'done-area' }),
      node({
        id: 'stale-leaf',
        title: 'Forgotten leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Forgotten leaf')
  })

  it('only considers direct children, not nested descendants', () => {
    const nodes = [
      home,
      node({
        id: 'fresh-area',
        title: 'Fresh area',
        last_visited_at: now.toISOString(),
      }),
      node({
        id: 'nested',
        title: 'Nested stale',
        parent_id: 'fresh-area',
        last_visited_at: null,
      }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())).toBeNull()
  })
})
