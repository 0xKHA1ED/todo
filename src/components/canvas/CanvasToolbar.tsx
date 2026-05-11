'use client'

import { Loader2, LogOut, Maximize2, Minimize2, Network, Plus } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useFilter } from '@/hooks/useFilter'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface CanvasToolbarProps {
  loading: boolean
  error: string | null
}

export function CanvasToolbar({ loading, error }: CanvasToolbarProps) {
  const { toast } = useToast()
  const { fitView } = useReactFlow()
  const signOut = useAuthStore((state) => state.signOut)
  const nodes = useNodeStore((state) => state.nodes)
  const createNode = useNodeStore((state) => state.createNode)
  const focusedNodeId = useUIStore((state) => state.focusedNodeId)
  const exitFocusMode = useUIStore((state) => state.exitFocusMode)
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)
  const visibleIds = useFilter()

  async function addTopLevelNode() {
    try {
      const root = nodes.find((node) => node.parent_id === null)
      const node = await createNode({ parent_id: root?.id ?? null, title: 'New Task' })
      requestTitleFocus(node.id)
    } catch (caught) {
      toast({
        title: 'Node creation failed',
        description: caught instanceof Error ? caught.message : 'Could not create a node.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card/95 p-1.5 shadow-lg backdrop-blur">
      <div className="hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:flex">
        <Network className="h-3.5 w-3.5" />
        {visibleIds.size}/{nodes.length}
      </div>
      <Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.2, duration: 400 })}>
        <Maximize2 className="mr-2 h-3.5 w-3.5" />
        Fit
      </Button>
      {focusedNodeId && (
        <Button size="sm" variant="outline" onClick={exitFocusMode}>
          <Minimize2 className="mr-2 h-3.5 w-3.5" />
          Exit focus
        </Button>
      )}
      <Button size="sm" onClick={addTopLevelNode}>
        <Plus className="mr-2 h-3.5 w-3.5" />
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => signOut().catch(() => undefined)}>
        <LogOut className="mr-2 h-3.5 w-3.5" />
        Sign out
      </Button>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <span className="max-w-56 truncate text-xs text-destructive">{error}</span>}
    </div>
  )
}
