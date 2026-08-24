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
})