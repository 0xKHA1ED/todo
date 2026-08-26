'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeRecord } from '@/types'

interface PromoteDialogProps {
  item: NodeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromoteDialog({ item, open, onOpenChange }: PromoteDialogProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const promoteInboxItem = useNodeStore((state) => state.promoteInboxItem)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const [kind, setKind] = useState<'project' | 'module'>('project')
  const [parentId, setParentId] = useState('')
  const [title, setTitle] = useState('')

  const parents = useMemo(() => {
    if (kind === 'project') {
      return nodes.filter((node) => node.parent_id === null || node.kind === 'domain')
    }
    return nodes.filter((node) => node.kind === 'project' || node.kind === 'module')
  }, [kind, nodes])

  const root = nodes.find((node) => node.parent_id === null)

  function handleOpenDefaults() {
    setKind('project')
    setTitle(item?.title ?? '')
    setParentId(root?.id ?? '')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!item) return
    try {
      const created = await promoteInboxItem(item.id, {
        kind,
        parentId: parentId || root?.id || '',
        title,
      })
      toast({ title: 'Promoted to problem stage' })
      onOpenChange(false)
      useUIStore.getState().setInboxOpen(false)
      enterPlace(created.id)
    } catch (error) {
      toast({
        title: 'Promote failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) handleOpenDefaults()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Promote to project / module</DialogTitle>
            <DialogDescription>Starts at Problem stage. Captured text becomes the first Problem notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="promote-title">Title</Label>
            <Input id="promote-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kind</Label>
            <div className="flex gap-2">
              {(['project', 'module'] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={kind === option ? 'default' : 'secondary'}
                  className="capitalize"
                  onClick={() => setKind(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promote-parent">{kind === 'project' ? 'Domain / Home' : 'Parent project or module'}</Label>
            <select
              id="promote-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.parent_id === null ? 'Home' : parent.title}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="promote-submit">
              Promote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
