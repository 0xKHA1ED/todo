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
import { activatePlace } from '@/lib/life-pm/activatePlace'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useCommandSearch } from '@/hooks/useCommandSearch'
import { useToast } from '@/components/ui/use-toast'

export function CommandPalette() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const results = useCommandSearch(query)
  const nodes = useNodeStore((state) => state.nodes)
  const isCommandPaletteOpen = useUIStore((state) => state.isCommandPaletteOpen)
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
  const openPanel = useUIStore((state) => state.openPanel)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const setInboxOpen = useUIStore((state) => state.setInboxOpen)
  const filingNodeId = useUIStore((state) => state.filingNodeId)

  async function handleSelect(nodeId: string) {
    const hit = nodes.find((node) => node.id === nodeId)
    toggleCommandPalette(false)
    setQuery('')
    if (!hit) return

    if (filingNodeId) {
      const result = await activatePlace(hit.id)
      if (result.blocked) {
        toast({ title: result.blocked.title, description: result.blocked.description })
      }
      return
    }

    if (hit.system_role === 'inbox') {
      setInboxOpen(true)
      return
    }

    if (hit.kind === 'domain' || hit.kind === 'project' || hit.kind === 'module' || hit.parent_id === null) {
      enterPlace(hit.id)
      return
    }

    if (hit.parent_id) {
      enterPlace(hit.parent_id)
      window.requestAnimationFrame(() => openPanel(hit.id))
    }
  }

  return (
    <CommandDialog
      open={isCommandPaletteOpen}
      onOpenChange={(open) => toggleCommandPalette(open)}
      title="Command palette"
      description="Search titles and descriptions, then jump to a node."
    >
      <CommandInput placeholder="Search titles and descriptions..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching nodes.</CommandEmpty>
        <CommandGroup heading="Nodes">
          {results.map((node) => (
            <CommandItem key={node.id} value={`${node.title} ${node.descriptionPreview} ${node.tags.join(' ')}`} onSelect={() => void handleSelect(node.id)}>
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
