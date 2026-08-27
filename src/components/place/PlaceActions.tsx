'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface PlaceActionsProps {
  nodeId: string
  title: string
}

export function PlaceActions({ nodeId, title }: PlaceActionsProps) {
  const { toast } = useToast()
  const deleteNode = useNodeStore((state) => state.deleteNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function confirmDelete() {
    try {
      const node = useNodeStore.getState().nodes.find((candidate) => candidate.id === nodeId)
      const parentId = node?.parent_id
      const standing = useUIStore.getState().currentPlaceId
      await deleteNode(nodeId)
      setDeleteOpen(false)
      useUIStore.getState().closePanel()
      if (parentId && standing === nodeId) {
        useUIStore.getState().enterPlace(parentId)
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete this item.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
        aria-label={`Edit ${title}`}
        data-testid="place-edit"
        onClick={() => openPanel(nodeId)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-slate-500 hover:text-rose-700"
        aria-label={`Delete ${title}`}
        data-testid="place-delete"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this subtree?</DialogTitle>
            <DialogDescription>
              This permanently removes &ldquo;{title}&rdquo; and every child node below it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" data-testid="confirm-delete" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
