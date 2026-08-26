'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useToast } from '@/components/ui/use-toast'

interface BreakGlassDialogProps {
  nodeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BreakGlassDialog({ nodeId, open, onOpenChange }: BreakGlassDialogProps) {
  const { toast } = useToast()
  const breakGlassToExecute = useNodeStore((state) => state.breakGlassToExecute)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      setSubmitting(true)
      await breakGlassToExecute(nodeId, reason)
      toast({ title: 'Skipped to Execute' })
      setReason('')
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Could not skip',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Emergency: skip to Execute</DialogTitle>
            <DialogDescription>
              This flags the module on the portfolio. Use it when production is on fire — not when you are excited to build.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="break-glass-reason">Reason</Label>
            <textarea
              id="break-glass-reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[6rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting || !reason.trim()}>
              Skip to Execute
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
