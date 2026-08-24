'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { NodeDetailForm } from './NodeDetailForm'

export function SlideOutPanel() {
  const isPanelOpen = useUIStore((state) => state.isPanelOpen)
  const selectedNodeId = useUIStore((state) => state.selectedNodeId)
  const closePanel = useUIStore((state) => state.closePanel)
  const node = useNodeStore((state) => state.nodes.find((candidate) => candidate.id === selectedNodeId))

  return (
    <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        className="w-[94vw] overflow-y-auto border-l border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.95))] sm:max-w-none md:w-[640px]"
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
