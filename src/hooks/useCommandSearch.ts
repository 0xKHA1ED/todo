'use client'

import { useMemo } from 'react'
import { searchCommandNodes } from '@/lib/search/commandSearch'
import { useNodeStore } from '@/lib/store/useNodeStore'
import type { CommandSearchResult } from '@/types'

export function useCommandSearch(query: string): CommandSearchResult[] {
  const nodes = useNodeStore((state) => state.nodes)

  return useMemo(() => searchCommandNodes(nodes, query), [nodes, query])
}
