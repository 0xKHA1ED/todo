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
      .filter((node) => node.parent_id !== null)
      .filter((node) => {
        if (!normalized) return true
        const preview = getPlainTextFromTipTap(node.description).slice(0, 120)
        return (
          node.title.toLowerCase().includes(normalized) ||
          preview.toLowerCase().includes(normalized) ||
          node.tags.some((tag) => tag.toLowerCase().includes(normalized))
        )
      })
      .map((node) => ({
        id: node.id,
        title: node.title,
        descriptionPreview: getPlainTextFromTipTap(node.description).slice(0, 120),
      }))
      .slice(0, 30)
  }, [nodes, query])
}
