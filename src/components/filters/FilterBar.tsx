'use client'

import { KeyboardEvent, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/utils'
import type { Urgency } from '@/types'

const URGENCIES: Urgency[] = ['low', 'normal', 'high']

export function FilterBar() {
  const nodes = useNodeStore((state) => state.nodes)
  const activeUrgencyFilter = useUIStore((state) => state.activeUrgencyFilter)
  const activeTagFilters = useUIStore((state) => state.activeTagFilters)
  const setUrgencyFilter = useUIStore((state) => state.setUrgencyFilter)
  const setTagFilter = useUIStore((state) => state.setTagFilter)
  const clearFilters = useUIStore((state) => state.clearFilters)
  const [tagInput, setTagInput] = useState('')

  const allTags = useMemo(
    () => Array.from(new Set(nodes.flatMap((node) => node.tags))).sort((a, b) => a.localeCompare(b)).slice(0, 12),
    [nodes],
  )

  const hasFilters = activeUrgencyFilter.length > 0 || activeTagFilters.length > 0

  function toggleUrgency(urgency: Urgency) {
    setUrgencyFilter(
      activeUrgencyFilter.includes(urgency)
        ? activeUrgencyFilter.filter((active) => active !== urgency)
        : [...activeUrgencyFilter, urgency],
    )
  }

  function toggleTag(tag: string) {
    setTagFilter(
      activeTagFilters.includes(tag)
        ? activeTagFilters.filter((active) => active !== tag)
        : [...activeTagFilters, tag],
    )
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const tag = tagInput.trim()
    if (!tag) return
    setTagFilter(Array.from(new Set([...activeTagFilters, tag])))
    setTagInput('')
  }

  return (
    <div className="flex max-w-4xl flex-wrap items-center gap-2 rounded-xl border bg-card/90 p-2 shadow-xl backdrop-blur">
      {URGENCIES.map((urgency) => (
        <Button
          key={urgency}
          size="sm"
          variant={activeUrgencyFilter.includes(urgency) ? 'default' : 'secondary'}
          className={cn(
            'capitalize',
            urgency === 'low' && activeUrgencyFilter.includes(urgency) && 'bg-urgency-low text-zinc-950 hover:bg-urgency-low/90',
            urgency === 'normal' && activeUrgencyFilter.includes(urgency) && 'bg-urgency-normal text-zinc-950 hover:bg-urgency-normal/90',
            urgency === 'high' && activeUrgencyFilter.includes(urgency) && 'bg-urgency-high text-white hover:bg-urgency-high/90',
          )}
          onClick={() => toggleUrgency(urgency)}
        >
          {urgency}
        </Button>
      ))}

      <div className="h-6 w-px bg-border" />

      {allTags.map((tag) => (
        <button key={tag} type="button" onClick={() => toggleTag(tag)}>
          <Badge variant={activeTagFilters.includes(tag) ? 'default' : 'secondary'}>{tag}</Badge>
        </button>
      ))}

      <Input
        className="h-8 w-36"
        placeholder="Filter tag..."
        value={tagInput}
        onChange={(event) => setTagInput(event.target.value)}
        onKeyDown={handleTagKeyDown}
      />

      {hasFilters && (
        <Button size="sm" variant="ghost" onClick={clearFilters}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
