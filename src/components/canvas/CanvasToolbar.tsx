'use client'

import { Loader2, LogOut, Maximize2, Plus } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)

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
    <div className="flex items-center gap-2 rounded-xl border bg-card/90 p-2 shadow-xl backdrop-blur">
      <Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.2, duration: 400 })}>
        <Maximize2 className="mr-2 h-3.5 w-3.5" />
        Fit
      </Button>
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
