'use client'

import { useMemo } from 'react'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { getPlainTextFromTipTap } from '@/lib/utils'
import type { CommandSearchResult } from '@/types'

export function useCommandSearch(query: string): CommandSearchResult[] {
  const nodes = useNodeStore((state) => state.nodes)

  return useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return nodes
      .map((node) => ({
        id: node.id,
        title: node.title,
        descriptionPreview: getPlainTextFromTipTap(node.description).slice(0, 120),
      }))
      .filter((node) => {
        if (!normalized) return true
        return (
          node.title.toLowerCase().includes(normalized) ||
          node.descriptionPreview.toLowerCase().includes(normalized)
        )
      })
      .slice(0, 30)
  }, [nodes, query])
}
