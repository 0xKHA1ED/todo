'use client'

import { useMemo, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { isValidMoveParent } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import type { NodeRecord } from '@/types'

type MoveTarget = {
  id: string
  title: string
  path: string
  isCurrentParent: boolean
}

function buildMoveTargets(nodes: NodeRecord[], node: NodeRecord, subtreeIds: Set<string>) {
  const nodesById = new Map(nodes.map((candidate) => [candidate.id, candidate]))

  return nodes
    .filter((candidate) => !subtreeIds.has(candidate.id) && isValidMoveParent(node, candidate, nodes))
    .map<MoveTarget>((candidate) => {
      const path: string[] = []
      let current = candidate
      const visited = new Set<string>()

      while (current.parent_id && !visited.has(current.id)) {
        visited.add(current.id)
        const parent = nodesById.get(current.parent_id)
        if (!parent) break
        path.unshift(parent.parent_id === null ? 'Home' : parent.title)
        current = parent
      }

      return {
        id: candidate.id,
        title: candidate.parent_id === null ? 'Home' : candidate.title,
        path: path.join(' / ') || 'Home',
        isCurrentParent: candidate.id === node.parent_id,
      }
    })
}

interface MoveNodeDialogProps {
  nodeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveNodeDialog({ nodeId, open, onOpenChange }: MoveNodeDialogProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const getSubtreeIds = useNodeStore((state) => state.getSubtreeIds)
  const [pendingParentId, setPendingParentId] = useState<string | null>(null)
  const node = nodes.find((candidate) => candidate.id === nodeId) ?? null

  const moveTargets = useMemo(() => {
    if (!node) return []
    return buildMoveTargets(nodes, node, new Set(getSubtreeIds(node.id)))
  }, [getSubtreeIds, node, nodes])

  async function moveNode(newParentId: string) {
    if (pendingParentId) return

    if (!node || newParentId === node.parent_id) {
      onOpenChange(false)
      return
    }

    try {
      setPendingParentId(newParentId)
      await reparentNode(node.id, newParentId)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: error instanceof Error && error.message.includes('Tasks unlock') ? 'Tasks unlock in Execute' : 'Move failed',
        description: error instanceof Error ? error.message : 'Choose a valid destination for this item.',
        variant: error instanceof Error && error.message.includes('Tasks unlock') ? 'default' : 'destructive',
      })
    } finally {
      setPendingParentId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Move this subtree</DialogTitle>
          <DialogDescription>Pick the new parent. The selected node and every child below it move together.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search destinations..." />
          <CommandList>
            <CommandEmpty>No valid destinations.</CommandEmpty>
            <CommandGroup heading="Move under">
              {moveTargets.map((target) => (
                <CommandItem
                  key={target.id}
                  value={`${target.title} ${target.path}`}
                  disabled={pendingParentId !== null}
                  onClick={() => void moveNode(target.id)}
                  onSelect={() => void moveNode(target.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{target.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {target.isCurrentParent ? 'Current parent' : target.path}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}