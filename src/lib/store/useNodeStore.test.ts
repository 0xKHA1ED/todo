import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateNodePayload, NodeRecord } from '@/types'

vi.mock('@/lib/supabase/queries', () => ({
  fetchNodes: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNodeCascade: vi.fn(),
  reparentNode: vi.fn(),
}))

import * as queries from '@/lib/supabase/queries'
import { useNodeStore } from './useNodeStore'
import { useAuthStore } from './useAuthStore'

const mocked = vi.mocked(queries)

let idCounter = 0

function record(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user-1',
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
    ...partial,
  }
}

function setNodes(nodes: NodeRecord[]) {
  useNodeStore.setState({ nodes, loading: false, error: null })
}

beforeEach(() => {
  idCounter = 0
  vi.clearAllMocks()
  useAuthStore.setState({ user: { id: 'user-1' } as never, session: null, loading: false })
  useNodeStore.setState({ nodes: [], loading: false, error: null })

  mocked.createNode.mockImplementation(async (payload) =>
    record({ ...(payload as CreateNodePayload & { user_id: string }), id: `generated-${(idCounter += 1)}` } as never),
  )
  mocked.updateNode.mockResolvedValue(undefined)
  mocked.deleteNodeCascade.mockResolvedValue(undefined)
  mocked.reparentNode.mockResolvedValue(undefined)
})

describe('useNodeStore.createNode', () => {
  it('defaults sort_order to the sibling count and appends the created node', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'a', title: 'A', sort_order: 0 }),
    ])

    const created = await useNodeStore.getState().createNode({ parent_id: 'home', title: 'B' })

    expect(mocked.createNode).toHaveBeenCalledWith(expect.objectContaining({ parent_id: 'home', title: 'B', sort_order: 1 }))
    expect(useNodeStore.getState().nodes.some((node) => node.id === created.id)).toBe(true)
  })
})

describe('useNodeStore.updateNode', () => {
  it('applies an optimistic patch', async () => {
    setNodes([record({ id: 'a', title: 'A' })])
    await useNodeStore.getState().updateNode('a', { title: 'Renamed' })
    expect(useNodeStore.getState().nodes.find((node) => node.id === 'a')?.title).toBe('Renamed')
  })

  it('rolls back the optimistic patch when the query fails', async () => {
    setNodes([record({ id: 'a', title: 'A' })])
    mocked.updateNode.mockRejectedValueOnce(new Error('nope'))

    await expect(useNodeStore.getState().updateNode('a', { title: 'Renamed' })).rejects.toThrow('nope')
    expect(useNodeStore.getState().nodes.find((node) => node.id === 'a')?.title).toBe('A')
  })
})

describe('useNodeStore.deleteNode', () => {
  it('refuses to delete the root or the inbox node', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'inbox', title: 'Inbox', system_role: 'inbox' }),
    ])

    await expect(useNodeStore.getState().deleteNode('home')).rejects.toThrow(/root node cannot be deleted/)
    await expect(useNodeStore.getState().deleteNode('inbox')).rejects.toThrow(/Inbox cannot be deleted/)
    expect(mocked.deleteNodeCascade).not.toHaveBeenCalled()
  })

  it('removes the whole subtree optimistically', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'area', title: 'Area' }),
      record({ id: 'child', title: 'Child', parent_id: 'area' }),
      record({ id: 'keep', title: 'Keep' }),
    ])

    await useNodeStore.getState().deleteNode('area')

    expect(useNodeStore.getState().nodes.map((node) => node.id).sort()).toEqual(['home', 'keep'])
    expect(mocked.deleteNodeCascade).toHaveBeenCalledWith('area')
  })

  it('restores the subtree if the cascade delete fails', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'area', title: 'Area' }),
      record({ id: 'child', title: 'Child', parent_id: 'area' }),
    ])
    mocked.deleteNodeCascade.mockRejectedValueOnce(new Error('boom'))

    await expect(useNodeStore.getState().deleteNode('area')).rejects.toThrow('boom')
    expect(useNodeStore.getState().nodes.map((node) => node.id).sort()).toEqual(['area', 'child', 'home'])
  })
})

describe('useNodeStore.reparentNode', () => {
  it('guards against invalid moves', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'inbox', title: 'Inbox', system_role: 'inbox' }),
      record({ id: 'a', title: 'A' }),
    ])

    await expect(useNodeStore.getState().reparentNode('home', 'a')).rejects.toThrow(/root node cannot be re-parented/)
    await expect(useNodeStore.getState().reparentNode('inbox', 'a')).rejects.toThrow(/Inbox cannot be moved/)
    await expect(useNodeStore.getState().reparentNode('a', 'a')).rejects.toThrow(/cannot be parented to itself/)
  })

  it('moves a node and appends it to the destination order', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'dest', title: 'Dest' }),
      record({ id: 'existing', title: 'Existing', parent_id: 'dest', sort_order: 0 }),
      record({ id: 'mover', title: 'Mover' }),
    ])

    await useNodeStore.getState().reparentNode('mover', 'dest')

    const mover = useNodeStore.getState().nodes.find((node) => node.id === 'mover')
    expect(mover?.parent_id).toBe('dest')
    expect(mover?.sort_order).toBe(1)
    expect(mocked.reparentNode).toHaveBeenCalledWith('mover', 'dest', 1)
  })
})

describe('useNodeStore selectors', () => {
  beforeEach(() => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'biz', title: 'Business', sort_order: 1 }),
      record({ id: 'design', title: 'Design', parent_id: 'biz' }),
      record({ id: 'logo', title: 'Logo', parent_id: 'design' }),
      record({ id: 'health', title: 'Health', sort_order: 0 }),
    ])
  })

  it('getChildren returns sorted immediate children', () => {
    expect(useNodeStore.getState().getChildren('home').map((node) => node.id)).toEqual(['health', 'biz'])
  })

  it('getAncestors returns the chain from root to parent', () => {
    expect(useNodeStore.getState().getAncestors('logo').map((node) => node.id)).toEqual(['home', 'biz', 'design'])
  })

  it('getSubtreeIds includes the node and its descendants', () => {
    expect(useNodeStore.getState().getSubtreeIds('biz').sort()).toEqual(['biz', 'design', 'logo'])
  })
})

describe('useNodeStore.markVisited', () => {
  it('stamps the place and its ancestors, rolling back on failure', async () => {
    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'biz', title: 'Business' }),
      record({ id: 'design', title: 'Design', parent_id: 'biz' }),
    ])

    await useNodeStore.getState().markVisited('design')
    const stampedIds = useNodeStore
      .getState()
      .nodes.filter((node) => node.last_visited_at !== null)
      .map((node) => node.id)
      .sort()
    expect(stampedIds).toEqual(['biz', 'design', 'home'])

    setNodes([
      record({ id: 'home', title: 'Main', parent_id: null }),
      record({ id: 'biz', title: 'Business' }),
    ])
    mocked.updateNode.mockRejectedValueOnce(new Error('offline'))
    await expect(useNodeStore.getState().markVisited('biz')).rejects.toThrow('offline')
    expect(useNodeStore.getState().nodes.every((node) => node.last_visited_at === null)).toBe(true)
  })
})

describe('useNodeStore.fetchAllNodes', () => {
  it('creates the root and inbox system nodes when the account is empty', async () => {
    mocked.fetchNodes.mockResolvedValueOnce([])

    await useNodeStore.getState().fetchAllNodes()

    const nodes = useNodeStore.getState().nodes
    expect(nodes.find((node) => node.parent_id === null)?.title).toBe('Main')
    expect(nodes.find((node) => node.system_role === 'inbox')?.title).toBe('Inbox')
    expect(useNodeStore.getState().loading).toBe(false)
  })
})
