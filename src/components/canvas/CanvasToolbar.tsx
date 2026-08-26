'use client'

import { Loader2, Maximize2, Plus } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { canCreateTask, defaultKindForParent } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface CanvasToolbarProps {
  loading: boolean
  error: string | null
}

export function CanvasToolbar({ loading, error }: CanvasToolbarProps) {
  const { toast } = useToast()
  const { fitView } = useReactFlow()
  const nodes = useNodeStore((state) => state.nodes)
  const createNode = useNodeStore((state) => state.createNode)
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
  const showDone = useUIStore((state) => state.showDone)
  const setShowDone = useUIStore((state) => state.setShowDone)
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)
  const place = nodes.find((node) => node.id === currentPlaceId) ?? null
  const addKind = place ? defaultKindForParent(place, nodes) : 'task'
  const addDisabled = Boolean(place && addKind === 'task' && !canCreateTask(place, nodes))

  async function addChild() {
    if (!currentPlaceId || !place) return
    if (addDisabled) {
      toast({ title: 'Tasks unlock in Execute', description: 'Finish the earlier stages first, or use emergency skip.' })
      return
    }
    try {
      const node = await createNode({ parent_id: currentPlaceId, kind: addKind })
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
    <div className="flex items-center gap-2 rounded-full border border-white/75 bg-white/78 p-1.5 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.8)] backdrop-blur-xl">
      <Button size="sm" variant="secondary" onClick={() => fitView({ padding: 0.12, duration: 320 })}>
        <Maximize2 className="mr-2 h-3.5 w-3.5" />
        Fit
      </Button>
      <Button size="sm" onClick={addChild} disabled={!currentPlaceId || addDisabled} title={addDisabled ? 'Tasks unlock in Execute' : undefined}>
        <Plus className="mr-2 h-3.5 w-3.5" />
        Add
      </Button>
      <Button
        size="sm"
        variant={showDone ? 'default' : 'secondary'}
        aria-pressed={showDone}
        onClick={() => setShowDone(!showDone)}
      >
        Show done
      </Button>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <span className="max-w-56 truncate text-xs text-destructive">{error}</span>}
    </div>
  )
}
