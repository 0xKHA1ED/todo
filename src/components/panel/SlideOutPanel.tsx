'use client'

import { useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useFilter } from '@/hooks/useFilter'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { NodeDetailForm } from './NodeDetailForm'

export function SlideOutPanel() {
  const { isPanelOpen, selectedNodeId, closePanel } = useUIStore()
  const node = useNodeStore((state) => state.nodes.find((candidate) => candidate.id === selectedNodeId))
  const visibleIds = useFilter()

  useEffect(() => {
    if (isPanelOpen && selectedNodeId && !visibleIds.has(selectedNodeId)) closePanel()
  }, [closePanel, isPanelOpen, selectedNodeId, visibleIds])

  return (
    <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        className="w-[92vw] overflow-y-auto sm:max-w-none md:w-[600px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{node?.title ?? 'Node details'}</SheetTitle>
        </SheetHeader>
        {node ? (
          <NodeDetailForm node={node} />
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Select a node to edit its details.</p>
        )}
      </SheetContent>
    </Sheet>
  )
}
