'use client'

import { useMemo } from 'react'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

export function useFilter(): Set<string> {
  const nodes = useNodeStore((state) => state.nodes)
  const getSubtreeIds = useNodeStore((state) => state.getSubtreeIds)
  const focusedNodeId = useUIStore((state) => state.focusedNodeId)
  const activeUrgencyFilter = useUIStore((state) => state.activeUrgencyFilter)
  const activeTagFilters = useUIStore((state) => state.activeTagFilters)

  return useMemo(() => {
    if (focusedNodeId && nodes.some((node) => node.id === focusedNodeId)) {
      return new Set(getSubtreeIds(focusedNodeId))
    }

    if (activeUrgencyFilter.length === 0 && activeTagFilters.length === 0) {
      return new Set(nodes.map((node) => node.id))
    }

    const matching = nodes.filter((node) => {
      const urgencyMatch = activeUrgencyFilter.length === 0 || activeUrgencyFilter.includes(node.urgency)
      const tagMatch =
        activeTagFilters.length === 0 || activeTagFilters.some((tag) => node.tags.includes(tag))
      return urgencyMatch && tagMatch
    })

    const visibleIds = new Set<string>()
    const includeWithAncestors = (id: string) => {
      visibleIds.add(id)
      const node = nodes.find((candidate) => candidate.id === id)
      if (node?.parent_id) includeWithAncestors(node.parent_id)
    }

    matching.forEach((node) => includeWithAncestors(node.id))
    return visibleIds
  }, [activeTagFilters, activeUrgencyFilter, focusedNodeId, getSubtreeIds, nodes])
}
