'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
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
import { parseChecklistProgress, type ChecklistProgress } from '@/lib/editor/checklistProgress'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn, parseTags } from '@/lib/utils'
import type { DomainTag, Health, NodeRecord, PmStatus, Urgency } from '@/types'
import { MoveNodeDialog } from './MoveNodeDialog'
import { MarkdownEditor } from './MarkdownEditor'

const URGENCIES: Urgency[] = ['low', 'normal', 'high']
const PM_STATUSES: PmStatus[] = ['idea', 'active', 'paused', 'done', 'archived']
const DOMAIN_TAGS: DomainTag[] = ['professional', 'home', 'business', 'personal', 'health', 'other']
const HEALTHS: Health[] = ['on_track', 'at_risk', 'stalled', 'blocked']

interface NodeDetailFormProps {
  node: NodeRecord
}

export function NodeDetailForm({ node }: NodeDetailFormProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const updateNode = useNodeStore((state) => state.updateNode)
  const deleteNode = useNodeStore((state) => state.deleteNode)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const closePanel = useUIStore((state) => state.closePanel)
  const titleFocusRequest = useUIStore((state) => state.titleFocusRequest)
  const clearTitleFocusRequest = useUIStore((state) => state.clearTitleFocusRequest)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(node.title)
  const [outcome, setOutcome] = useState(node.outcome)
  const [tags, setTags] = useState(node.tags.join(', '))
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>(() => parseChecklistProgress(node.description))
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  const nodesById = useMemo(() => new Map(nodes.map((candidate) => [candidate.id, candidate])), [nodes])
  const currentParent = node.parent_id ? nodesById.get(node.parent_id) ?? null : null
  const isPmNode = node.kind === 'domain' || node.kind === 'project' || node.kind === 'module'
  const isTask = node.kind === 'task' || node.kind === null

  useEffect(() => {
    setTitle(node.title)
    setOutcome(node.outcome)
    setTags(node.tags.join(', '))
    setChecklistProgress(parseChecklistProgress(node.description))
  }, [node.description, node.id, node.outcome, node.tags, node.title])

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
      const parentId = node.parent_id
      const standing = useUIStore.getState().currentPlaceId
      await deleteNode(node.id)
      setDeleteOpen(false)
      closePanel()
      if (parentId && standing === node.id) {
        useUIStore.getState().enterPlace(parentId)
      }
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

      {isPmNode && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-outcome">Outcome</Label>
            <Input
              id="node-outcome"
              value={outcome}
              placeholder="Done when…"
              onChange={(event) => setOutcome(event.target.value)}
              onBlur={() => {
                if (outcome !== node.outcome) void patchNode({ outcome })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {PM_STATUSES.map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={node.pm_status === status ? 'default' : 'secondary'}
                  className="capitalize"
                  onClick={() => patchNode({ pm_status: status })}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
          {node.kind !== 'module' && (
            <div className="space-y-2">
              <Label>Domain tag</Label>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={node.domain_tag === tag ? 'default' : 'secondary'}
                    className="capitalize"
                    onClick={() => patchNode({ domain_tag: tag })}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {node.kind !== 'domain' && (
            <div className="space-y-2">
              <Label>Health</Label>
              <div className="flex flex-wrap gap-2">
                {HEALTHS.map((health) => (
                  <Button
                    key={health}
                    type="button"
                    size="sm"
                    variant={node.health === health ? 'default' : 'secondary'}
                    className="capitalize"
                    onClick={() => patchNode({ health })}
                  >
                    {health.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isTask && (
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
      )}

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={node.completed ? 'default' : 'outline'}
            className={cn(node.completed && 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700')}
          >
            {node.completed ? 'Completed' : 'Open'}
          </Badge>
          <Button
            type="button"
            variant={node.completed ? 'outline' : 'default'}
            onClick={() => patchNode({ completed: !node.completed })}
          >
            {node.completed ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Mark Uncompleted
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Completed
              </>
            )}
          </Button>
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
        <div className="space-y-1">
          <Label>Description</Label>
          {checklistProgress.total > 0 && (
            <p className="text-xs text-muted-foreground">
              {checklistProgress.completed}/{checklistProgress.total} steps
            </p>
          )}
        </div>
        <MarkdownEditor
          key={node.id}
          nodeId={node.id}
          initialContent={node.description}
          initialCompleted={node.completed}
          onChecklistProgressChange={setChecklistProgress}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Location</Label>
          <p className="text-sm text-muted-foreground">
            {currentParent ? `Inside ${currentParent.parent_id === null ? 'Home' : currentParent.title}` : 'Home'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={node.parent_id === null || node.system_role === 'inbox'}
          onClick={() => setMoveOpen(true)}
        >
          Move subtree
        </Button>
      </div>

      <Separator />

      <Button
        type="button"
        variant="destructive"
        disabled={node.parent_id === null || node.system_role === 'inbox'}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete node and children
      </Button>

      <MoveNodeDialog nodeId={node.id} open={moveOpen} onOpenChange={setMoveOpen} />

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
