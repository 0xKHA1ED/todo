'use client'

import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { NODE_SIZE } from '@/lib/flow/treeLayout'
import { useUIStore } from '@/lib/store/useUIStore'
import { useCommandSearch } from '@/hooks/useCommandSearch'

export function CommandPalette() {
  const [query, setQuery] = useState('')
  const results = useCommandSearch(query)
  const { getNode, setCenter } = useReactFlow()
  const isCommandPaletteOpen = useUIStore((state) => state.isCommandPaletteOpen)
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
  const openPanel = useUIStore((state) => state.openPanel)

  function handleSelect(nodeId: string) {
    toggleCommandPalette(false)
    setQuery('')
    openPanel(nodeId)
    const node = getNode(nodeId)
    if (node) {
      setCenter(node.position.x + NODE_SIZE.width / 2, node.position.y + NODE_SIZE.height / 2, {
        zoom: 1.2,
        duration: 600,
      })
    }
  }

  return (
    <CommandDialog open={isCommandPaletteOpen} onOpenChange={(open) => toggleCommandPalette(open)}>
      <CommandInput placeholder="Search titles and descriptions..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching nodes.</CommandEmpty>
        <CommandGroup heading="Nodes">
          {results.map((node) => (
            <CommandItem key={node.id} value={`${node.title} ${node.descriptionPreview}`} onSelect={() => handleSelect(node.id)}>
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
