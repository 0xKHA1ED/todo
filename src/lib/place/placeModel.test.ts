import { describe, expect, it } from 'vitest'
import { pickForgotten, rankNow, STALE_MS, visibleChildren, visitTargetIds } from './placeModel'
import type { NodeRecord, Urgency } from '@/types'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user',
    parent_id: 'home',
    system_role: null,
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
    expect(result.items.map((item) => item.node.title)).toEqual([
      'Also overdue',
      'Overdue',
      'Today',
      'This week',
      'High undated',
    ])
    expect(result.items.map((item) => item.bucket)).toEqual(['overdue', 'overdue', 'today', 'soon', 'high'])
    expect(result.overflow).toBe(1)
  })

  it('does not include the place node itself', () => {
    const nodes = [home, node({ id: 'child', title: 'Child', date: '2026-08-18' })]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.node.id)).toEqual(['child'])
  })

  it('includes nested descendants of the current place', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'bill', title: 'Pay ads', parent_id: 'biz', date: '2026-08-18' }),
    ]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.node.title)).toEqual(['Pay ads'])
  })

  it('sorts within a bucket by urgency and then oldest visit', () => {
    const nodes = [
      home,
      node({ id: 'normal-recent', title: 'Normal recent', date: '2026-08-18', last_visited_at: '2026-08-18T11:00:00.000Z' }),
      node({ id: 'normal-old', title: 'Normal old', date: '2026-08-18', last_visited_at: '2026-08-10T11:00:00.000Z' }),
      node({ id: 'high', title: 'High today', date: '2026-08-18', urgency: 'high', last_visited_at: '2026-08-18T11:59:00.000Z' }),
    ]

    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.node.title)).toEqual(['High today', 'Normal old', 'Normal recent'])
  })
})

describe('pickForgotten', () => {
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('picks the leaf unseen for the longest time anywhere in the subtree', () => {
    const nodes = [
      home,
      node({
        id: 'design',
        title: 'Design',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
      node({ id: 'logo', title: 'Logo', parent_id: 'design', last_visited_at: new Date(now.getTime() - STALE_MS * 2).toISOString() }),
      node({
        id: 'undated-leaf',
        title: 'Someday leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS * 3).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set())
    expect(picked?.title).toBe('Someday leaf')
  })

  it('does not skip a Now item when it is the oldest direct child', () => {
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
        last_visited_at: new Date(now.getTime() - STALE_MS + 1000).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set(['in-now']))
    expect(picked?.title).toBe('Due leaf')
  })

  it('still returns the oldest child when nothing is stale', () => {
    const nodes = [
      home,
      node({ id: 'fresh', title: 'Fresh', last_visited_at: now.toISOString() }),
      node({ id: 'older-fresh', title: 'Older fresh', last_visited_at: new Date(now.getTime() - 60_000).toISOString() }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Older fresh')
  })

  it('treats null last_visited_at as oldest', () => {
    const nodes = [
      home,
      node({ id: 'area', title: 'Health', last_visited_at: now.toISOString() }),
      node({ id: 'gym', title: 'Gym', parent_id: 'area', last_visited_at: null }),
      node({ id: 'fresh', title: 'Fresh leaf', last_visited_at: now.toISOString() }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Gym')
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

  it('considers nested leaf descendants even when their parent area is fresh', () => {
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
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Nested stale')
  })

  it('does not treat the Inbox system node as a forgotten leaf', () => {
    const nodes = [
      home,
      node({ id: 'inbox', title: 'Inbox', system_role: 'inbox', last_visited_at: null }),
      node({ id: 'real-leaf', title: 'Real leaf', last_visited_at: new Date(now.getTime() - 60_000).toISOString() }),
    ]

    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Real leaf')
  })
})

describe('visibleChildren', () => {
  const today = new Date(2026, 7, 18)
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('assigns loud, medium, area, and compact densities', () => {
    const nodes = [
      home,
      node({ id: 'faucet', title: 'Fix faucet', date: '2026-08-18' }),
      node({ id: 'plumber', title: 'Call plumber', date: '2026-08-21' }),
      node({ id: 'paint', title: 'Paint' }),
      node({ id: 'marketing', title: 'Marketing' }),
      node({ id: 'copy', title: 'Copy', parent_id: 'marketing' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    const byTitle = Object.fromEntries(views.map((view) => [view.node.title, view.density]))
    expect(byTitle['Fix faucet']).toBe('loud')
    expect(byTitle['Call plumber']).toBe('medium')
    expect(byTitle['Paint']).toBe('compact')
    expect(byTitle.Marketing).toBe('area')
    expect(views.find((view) => view.node.title === 'Marketing')?.insideCount).toBe(1)
  })

  it('treats Inbox as an area even when it has no children yet', () => {
    const views = visibleChildren(
      [home, node({ id: 'inbox', title: 'Inbox', system_role: 'inbox' })],
      'home',
      false,
      today,
      now,
    )

    expect(views[0]?.isArea).toBe(true)
    expect(views[0]?.density).toBe('area')
  })

  it('treats a high-urgency undated leaf as medium', () => {
    const highNodes = [home, node({ id: 'h', title: 'Urgent idea', urgency: 'high' })]
    const views = visibleChildren(highNodes, 'home', false, today, now)
    expect(views[0]?.density).toBe('medium')
  })

  it('makes an area loud when a descendant is due today', () => {
    const nodes = [
      home,
      node({ id: 'fin', title: 'Finances' }),
      node({ id: 'bill', title: 'Invoice', parent_id: 'fin', date: '2026-08-18' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    expect(views[0]?.density).toBe('loud')
    expect(views[0]?.dueCount).toBe(1)
  })

  it('makes an area loud when the area itself is due today', () => {
    const nodes = [
      home,
      node({ id: 'fin', title: 'Finances', date: '2026-08-18' }),
      node({ id: 'note', title: 'Someday note', parent_id: 'fin' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    expect(views[0]?.density).toBe('loud')
  })

  it('makes a high-urgency undated area at least medium', () => {
    const nodes = [
      home,
      node({ id: 'fin', title: 'Finances', urgency: 'high' }),
      node({ id: 'note', title: 'Someday note', parent_id: 'fin' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    expect(['medium', 'loud']).toContain(views[0]?.density)
  })

  it('hides completed leaves and fully-completed areas unless showDone', () => {
    const nodes = [
      home,
      node({ id: 'done', title: 'Done', completed: true }),
      node({ id: 'area', title: 'Old' }),
      node({ id: 'child', title: 'Old child', parent_id: 'area', completed: true }),
    ]
    expect(visibleChildren(nodes, 'home', false, today, now).map((view) => view.node.title)).toEqual([])
    expect(visibleChildren(nodes, 'home', true, today, now).map((view) => view.node.title)).toEqual(['Done', 'Old'])
  })
})

describe('visitTargetIds', () => {
  it('includes the place and ancestors, not descendants', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'design', title: 'Design', parent_id: 'biz' }),
      node({ id: 'logo', title: 'Logo', parent_id: 'design' }),
    ]
    expect(visitTargetIds(nodes, 'design')).toEqual(['design', 'biz', 'home'])
    expect(visitTargetIds(nodes, 'design')).not.toContain('logo')
  })
})
