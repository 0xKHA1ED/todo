'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn, parseTags } from '@/lib/utils'
import type { NodeRecord, Urgency } from '@/types'
import { MarkdownEditor } from './MarkdownEditor'

const URGENCIES: Urgency[] = ['low', 'normal', 'high']

interface NodeDetailFormProps {
  node: NodeRecord
}

export function NodeDetailForm({ node }: NodeDetailFormProps) {
  const { toast } = useToast()
  const updateNode = useNodeStore((state) => state.updateNode)
  const deleteNode = useNodeStore((state) => state.deleteNode)
  const closePanel = useUIStore((state) => state.closePanel)
  const titleFocusRequest = useUIStore((state) => state.titleFocusRequest)
  const clearTitleFocusRequest = useUIStore((state) => state.clearTitleFocusRequest)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(node.title)
  const [tags, setTags] = useState(node.tags.join(', '))
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setTitle(node.title)
    setTags(node.tags.join(', '))
  }, [node.id, node.tags, node.title])

  useEffect(() => {
    if (titleFocusRequest !== node.id) return
    titleRef.current?.focus()
    titleRef.current?.select()
    clearTitleFocusRequest()
  }, [clearTitleFocusRequest, node.id, titleFocusRequest])

  async function saveTitle() {
    const trimmed = title.trim() || 'New Task'
    setTitle(trimmed)
    if (trimmed === node.title) return
    try {
      await updateNode(node.id, { title: trimmed })
    } catch (error) {
      toast({
        title: 'Title save failed',
        description: error instanceof Error ? error.message : 'Could not save the node title.',
        variant: 'destructive',
      })
    }
  }

  async function saveTags() {
    const parsed = parseTags(tags)
    setTags(parsed.join(', '))
    if (JSON.stringify(parsed) === JSON.stringify(node.tags)) return
    try {
      await updateNode(node.id, { tags: parsed })
    } catch (error) {
      toast({
        title: 'Tags save failed',
        description: error instanceof Error ? error.message : 'Could not save tags.',
        variant: 'destructive',
      })
    }
  }

  async function patchNode(patch: Parameters<typeof updateNode>[1]) {
    try {
      await updateNode(node.id, patch)
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save your change.',
        variant: 'destructive',
      })
    }
  }

  async function confirmDelete() {
    try {
      await deleteNode(node.id)
      setDeleteOpen(false)
      closePanel()
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete the node.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="node-title">Title</Label>
        <Input
          ref={titleRef}
          id="node-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Urgency</Label>
        <div className="flex gap-2">
          {URGENCIES.map((urgency) => (
            <Button
              key={urgency}
              type="button"
              size="sm"
              variant={node.urgency === urgency ? 'default' : 'secondary'}
              className={cn(
                'capitalize',
                node.urgency === urgency && urgency === 'low' && 'bg-urgency-low text-zinc-950 hover:bg-urgency-low/90',
                node.urgency === urgency && urgency === 'normal' && 'bg-urgency-normal text-zinc-950 hover:bg-urgency-normal/90',
                node.urgency === urgency && urgency === 'high' && 'bg-urgency-high text-white hover:bg-urgency-high/90',
              )}
              onClick={() => patchNode({ urgency })}
            >
              {urgency}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="node-date">Date badge</Label>
          <Input
            id="node-date"
            type="date"
            value={node.date ?? ''}
            onChange={(event) => patchNode({ date: event.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="node-tags">Tags</Label>
          <Input
            id="node-tags"
            placeholder="infra, code, urgent"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            onBlur={saveTags}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </div>
      </div>

      {node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label>Description</Label>
        <MarkdownEditor key={node.id} nodeId={node.id} initialContent={node.description} />
      </div>

      <Separator />

      <Button
        type="button"
        variant="destructive"
        disabled={node.parent_id === null}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete node and children
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this subtree?</DialogTitle>
            <DialogDescription>
              This permanently removes &ldquo;{node.title}&rdquo; and every child node below it. The root node cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
