import { describe, expect, it } from 'vitest'
import { CONTEXT_LENSES, getLensById, LENS_ITEM_CAP, rankLensItems } from './contextLenses'
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

const today = new Date(2026, 7, 24)

describe('contextLenses', () => {
  const home = node({ id: 'home', title: 'Main', parent_id: null })

  it('exports the four fixed lenses', () => {
    expect(CONTEXT_LENSES).toHaveLength(4)
    expect(getLensById('errands')?.tag).toBe('errands')
  })

  it('includes only incomplete leaves with a matching tag anywhere under root', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'bank', title: 'Bank', parent_id: 'biz', tags: ['errands'], date: '2026-08-24' }),
      node({ id: 'area', title: 'Errands area', tags: ['errands'] }),
      node({ id: 'child', title: 'Under area', parent_id: 'area', tags: ['errands'] }),
      node({ id: 'done', title: 'Done errand', tags: ['errands'], completed: true }),
      node({ id: 'other', title: 'Email', tags: ['computer'] }),
    ]

    const result = rankLensItems(nodes, 'home', 'errands', today)

    expect(result.items.map((item) => item.node.title)).toEqual(['Bank', 'Under area'])
    expect(result.items.find((item) => item.node.title === 'Errands area')).toBeUndefined()
  })

  it('matches tags case-insensitively', () => {
    const nodes = [home, node({ id: 'task', title: 'A', tags: ['Errands'] })]
    expect(rankLensItems(nodes, 'home', 'errands', today).items).toHaveLength(1)
  })

  it('ranks overdue, today, soon, then high urgency, then everything else', () => {
    const nodes = [
      home,
      node({ id: 'later', title: 'Later', tags: ['errands'], date: '2026-09-10', sort_order: 5 }),
      node({ id: 'high', title: 'High', tags: ['errands'], urgency: 'high', sort_order: 4 }),
      node({ id: 'soon', title: 'Soon', tags: ['errands'], date: '2026-08-27', sort_order: 3 }),
      node({ id: 'today', title: 'Today', tags: ['errands'], date: '2026-08-24', sort_order: 2 }),
      node({ id: 'overdue', title: 'Overdue', tags: ['errands'], date: '2026-08-20', sort_order: 1 }),
      node({ id: 'someday', title: 'Someday', tags: ['errands'], sort_order: 6 }),
    ]

    const result = rankLensItems(nodes, 'home', 'errands', today)

    expect(result.items.map((item) => item.node.title)).toEqual(['Overdue', 'Today', 'Soon', 'High', 'Later', 'Someday'])
  })

  it('caps results and reports overflow', () => {
    const leaves = Array.from({ length: LENS_ITEM_CAP + 3 }, (_, index) =>
      node({ id: `leaf-${index}`, title: `E${index}`, tags: ['errands'], sort_order: index }),
    )

    const result = rankLensItems([home, ...leaves], 'home', 'errands', today)

    expect(result.items).toHaveLength(LENS_ITEM_CAP)
    expect(result.overflow).toBe(3)
  })
})