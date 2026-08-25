import { describe, expect, it } from 'vitest'
import { buildFlowGraph, buildProgressLookup, getNodeSize } from './treeLayout'
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

const home = node({ id: 'home', title: 'Main', parent_id: null })

describe('buildFlowGraph', () => {
  it('keeps stored positions for nodes that were already moved', () => {
    const graph = buildFlowGraph(
      [home, node({ id: 'alpha', title: 'Alpha', position_x: 180, position_y: 96 })],
      'home',
      false,
    )

    expect(graph.nodes[0]?.position).toEqual({ x: 180, y: 96 })
  })

  it('packs nodes without stored positions into compact rows', () => {
    const graph = buildFlowGraph(
      [
        home,
        node({ id: 'alpha', title: 'Alpha', sort_order: 0 }),
        node({ id: 'beta', title: 'Beta', sort_order: 1 }),
      ],
      'home',
      false,
    )

    expect(graph.nodes[0]?.position).toEqual({ x: 0, y: 0 })
    expect(graph.nodes[1]?.position).toEqual({ x: getNodeSize('compact', 0, 'Alpha').width + 20, y: 0 })
  })

  it('keeps fresh siblings in compact rows even when another node was dragged lower', () => {
    const graph = buildFlowGraph(
      [
        home,
        node({ id: 'alpha', title: 'Alpha', position_x: 420, position_y: 220, sort_order: 0 }),
        node({ id: 'beta', title: 'Beta', sort_order: 1 }),
        node({ id: 'gamma', title: 'Gamma', sort_order: 2 }),
      ],
      'home',
      false,
    )

    expect(graph.nodes.find((entry) => entry.id === 'alpha')?.position).toEqual({ x: 420, y: 220 })
    expect(graph.nodes.find((entry) => entry.id === 'beta')?.position?.y).toBe(0)
    expect(graph.nodes.find((entry) => entry.id === 'gamma')?.position?.y).toBe(0)
  })

  it('re-packs very sparse stored layouts for larger sibling sets', () => {
    const rowGap = getNodeSize('compact', 0, 'Alpha').width + 20
    const columnGap = getNodeSize('compact', 0, 'Alpha').height + 20
    const graph = buildFlowGraph(
      [
        home,
        node({ id: 'alpha', title: 'Alpha', position_x: 0, position_y: 0, sort_order: 0 }),
        node({ id: 'beta', title: 'Beta', position_x: 620, position_y: 0, sort_order: 1 }),
        node({ id: 'gamma', title: 'Gamma', position_x: 0, position_y: 420, sort_order: 2 }),
        node({ id: 'delta', title: 'Delta', position_x: 620, position_y: 420, sort_order: 3 }),
      ],
      'home',
      false,
    )

    expect(graph.nodes.find((entry) => entry.id === 'alpha')?.position).toEqual({ x: 0, y: 0 })
    expect(graph.nodes.find((entry) => entry.id === 'beta')?.position).toEqual({ x: rowGap, y: 0 })
    expect(graph.nodes.find((entry) => entry.id === 'gamma')?.position).toEqual({ x: rowGap * 2, y: 0 })
    expect(graph.nodes.find((entry) => entry.id === 'delta')?.position).toEqual({ x: 0, y: columnGap })
  })

  it('grows card size with attention load and long titles', () => {
    const quiet = getNodeSize('compact', 0, 'Short')
    const intense = getNodeSize('loud', 4, 'A much longer node title that should take more room on the canvas')

    expect(intense.width).toBeGreaterThan(quiet.width)
    expect(intense.height).toBeGreaterThan(quiet.height)
  })

  it('includes checklist progress for leaves with no child nodes', () => {
    const checklistDescription = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    })

    const progress = buildProgressLookup([
      home,
      node({ id: 'leaf', title: 'Bank', description: checklistDescription }),
    ])

    expect(progress.get('leaf')).toEqual({
      totalSubtaskCount: 2,
      completedSubtaskCount: 1,
      completionPercent: 50,
    })
  })

  it('merges a parent\u2019s own checklist steps with its child-node progress', () => {
    const checklistDescription = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    })

    const progress = buildProgressLookup([
      home,
      node({ id: 'area', title: 'Bank', description: checklistDescription }),
      node({ id: 'child', title: 'Deposit', parent_id: 'area', completed: true }),
    ])

    // 1 child node (completed) + 2 checklist steps (1 checked) => 3 total, 2 done
    expect(progress.get('area')).toEqual({
      totalSubtaskCount: 3,
      completedSubtaskCount: 2,
      completionPercent: 67,
    })
  })
})

describe('buildProgressLookup', () => {
  const checklist = (checked: number, unchecked: number) =>
    JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            ...Array.from({ length: checked }, () => ({
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph' }],
            })),
            ...Array.from({ length: unchecked }, () => ({
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph' }],
            })),
          ],
        },
      ],
    })

  it('produces identical results regardless of node ordering (regression)', () => {
    const parent = node({ id: 'parent', title: 'Parent', parent_id: 'home' })
    const child = node({ id: 'child', title: 'Child', parent_id: 'parent', description: checklist(1, 1) })

    const parentFirst = buildProgressLookup([home, parent, child]).get('parent')
    const childFirst = buildProgressLookup([home, child, parent]).get('parent')

    // 1 child node (open) + child's 2 checklist steps (1 done) => 3 total, 1 done.
    expect(parentFirst).toEqual({ totalSubtaskCount: 3, completedSubtaskCount: 1, completionPercent: 33 })
    expect(childFirst).toEqual(parentFirst)
  })

  it('rolls checklist steps from deep descendants up into ancestors', () => {
    const nodes = [
      home,
      node({ id: 'area', title: 'Area', parent_id: 'home' }),
      node({ id: 'mid', title: 'Mid', parent_id: 'area' }),
      node({ id: 'leaf', title: 'Leaf', parent_id: 'mid', description: checklist(2, 2) }),
    ]

    const progress = buildProgressLookup(nodes)
    // area subtree: mid (1) + leaf (1) + leaf's 4 checklist steps = 6 total, 2 done.
    expect(progress.get('area')).toEqual({ totalSubtaskCount: 6, completedSubtaskCount: 2, completionPercent: 33 })
    expect(progress.get('leaf')).toEqual({ totalSubtaskCount: 4, completedSubtaskCount: 2, completionPercent: 50 })
  })

  it('reports a completed leaf with no subtasks as 100 percent', () => {
    const progress = buildProgressLookup([home, node({ id: 'solo', title: 'Solo', completed: true })])
    expect(progress.get('solo')).toEqual({ totalSubtaskCount: 0, completedSubtaskCount: 0, completionPercent: 100 })
  })

  it('does not infinitely recurse on a malformed parent cycle', () => {
    const a = node({ id: 'a', title: 'A', parent_id: 'b' })
    const b = node({ id: 'b', title: 'B', parent_id: 'a' })
    expect(() => buildProgressLookup([home, a, b])).not.toThrow()
  })
})

describe('buildFlowGraph filtering', () => {
  it('hides completed leaves unless showDone is set and never emits edges', () => {
    const nodes = [
      home,
      node({ id: 'open', title: 'Open', sort_order: 0 }),
      node({ id: 'done', title: 'Done', completed: true, sort_order: 1 }),
    ]

    const hidden = buildFlowGraph(nodes, 'home', false)
    expect(hidden.nodes.map((entry) => entry.id)).toEqual(['open'])
    expect(hidden.edges).toEqual([])

    const shown = buildFlowGraph(nodes, 'home', true)
    expect(shown.nodes.map((entry) => entry.id).sort()).toEqual(['done', 'open'])
  })

  it('marks area nodes and carries inside/attention counts onto node data', () => {
    const nodes = [
      home,
      node({ id: 'area', title: 'Area', sort_order: 0 }),
      node({ id: 'kid', title: 'Kid', parent_id: 'area', urgency: 'high' }),
    ]

    const graph = buildFlowGraph(nodes, 'home', false)
    const area = graph.nodes.find((entry) => entry.id === 'area')
    expect(area?.data.isArea).toBe(true)
    expect(area?.data.insideCount).toBe(1)
    expect(area?.data.attentionCount).toBeGreaterThanOrEqual(1)
  })
})