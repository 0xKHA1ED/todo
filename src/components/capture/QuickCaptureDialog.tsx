'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getInboxId } from '@/lib/inbox/inboxModel'
import { parseQuickCaptureTitle } from '@/lib/inbox/quickCapture'
import { useNodeStore } from '@/lib/store/useNodeStore'

interface QuickCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCaptureDialog({ open, onOpenChange }: QuickCaptureDialogProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const createNode = useNodeStore((state) => state.createNode)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setSubmitting(false)
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const inboxId = getInboxId(nodes)
    if (!inboxId) {
      toast({
        title: 'Inbox unavailable',
        description: 'Could not find your Inbox.',
        variant: 'destructive',
      })
      return
    }

    const parsed = parseQuickCaptureTitle(title)
    if (!parsed.title.trim()) return

    try {
      setSubmitting(true)
      await createNode({ parent_id: inboxId, title: parsed.title, tags: parsed.tags, kind: 'task' })
      toast({ title: 'Captured' })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Capture failed',
        description: error instanceof Error ? error.message : 'Could not add this task to Inbox.',
        variant: 'destructive',
      })
      setSubmitting(false)
    }
  }

  const inboxId = getInboxId(nodes)
  const canSubmit = Boolean(inboxId) && title.trim().length > 0 && !submitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Quick capture</DialogTitle>
            <DialogDescription>
              Drops a task into your Inbox. End with #tags to label it, e.g. <span className="font-medium">Bank form #errands</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="quick-capture-title">Title</Label>
            <Input
              id="quick-capture-title"
              value={title}
              placeholder="Bring bank form #errands"
              onChange={(event) => setTitle(event.target.value)}
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Add to Inbox
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}