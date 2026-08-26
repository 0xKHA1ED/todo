'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { parseSessionExport } from '@/lib/life-pm/sessionMdParser'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useToast } from '@/components/ui/use-toast'

interface ImportSessionDialogProps {
  nodeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportSessionDialog({ nodeId, open, onOpenChange }: ImportSessionDialogProps) {
  const { toast } = useToast()
  const importSessionMd = useNodeStore((state) => state.importSessionMd)
  const [raw, setRaw] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseSessionExport(raw)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    try {
      setSubmitting(true)
      const result = await importSessionMd(nodeId, raw)
      toast({
        title: 'Session imported',
        description: result.warnings[0],
      })
      setRaw('')
      setErrors([])
      onOpenChange(false)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Import failed'])
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Import session MD</DialogTitle>
            <DialogDescription>Paste the session_export block from Cursor. This does not auto-advance the stage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="session-md">Markdown</Label>
            <textarea
              id="session-md"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="---&#10;life_pm_format: &quot;1.0&quot;&#10;type: session_export&#10;..."
              className="min-h-[16rem] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            />
            {errors.length > 0 && (
              <ul className="space-y-1 text-sm text-destructive">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" data-testid="import-session-submit" disabled={submitting || !raw.trim()}>
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
