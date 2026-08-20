'use client'

import { useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useCommandSearch } from '@/hooks/useCommandSearch'

export function CommandPalette() {
  const [query, setQuery] = useState('')
  const results = useCommandSearch(query)
  const nodes = useNodeStore((state) => state.nodes)
  const isCommandPaletteOpen = useUIStore((state) => state.isCommandPaletteOpen)
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
  const openPanel = useUIStore((state) => state.openPanel)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const selectNode = useUIStore((state) => state.selectNode)

  function handleSelect(nodeId: string) {
    const hit = nodes.find((node) => node.id === nodeId)
    const isArea = hit ? nodes.some((node) => node.parent_id === hit.id) : false
    toggleCommandPalette(false)
    setQuery('')
    if (!hit) return
    if (hit.parent_id) {
      enterPlace(hit.parent_id)
      if (isArea) {
        selectNode(hit.id)
      } else {
        window.requestAnimationFrame(() => openPanel(hit.id))
      }
    } else {
      enterPlace(hit.id)
    }
  }

  return (
    <CommandDialog open={isCommandPaletteOpen} onOpenChange={(open) => toggleCommandPalette(open)}>
      <CommandInput placeholder="Search titles and descriptions..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching nodes.</CommandEmpty>
        <CommandGroup heading="Nodes">
          {results.map((node) => (
            <CommandItem key={node.id} value={`${node.title} ${node.descriptionPreview} ${node.tags.join(' ')}`} onSelect={() => handleSelect(node.id)}>
              <div className="min-w-0">
                <p className="truncate font-medium">{node.title}</p>
                {node.descriptionPreview && (
                  <p className="truncate text-xs text-muted-foreground">{node.descriptionPreview}</p>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
