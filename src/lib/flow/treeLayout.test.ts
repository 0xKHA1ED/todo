import { describe, expect, it } from 'vitest'
import { buildFlowGraph, getNodeSize } from './treeLayout'
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

  it('grows card size with attention load and long titles', () => {
    const quiet = getNodeSize('compact', 0, 'Short')
    const intense = getNodeSize('loud', 4, 'A much longer node title that should take more room on the canvas')

    expect(intense.width).toBeGreaterThan(quiet.width)
    expect(intense.height).toBeGreaterThan(quiet.height)
  })
})