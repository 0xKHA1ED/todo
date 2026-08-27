'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canCreateTask } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { NodeRecord } from '@/types'

interface ExecuteListProps {
  place: NodeRecord
  onAddChild: () => void
}

export function ExecuteList({ place, onAddChild }: ExecuteListProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const createNode = useNodeStore((state) => state.createNode)
  const updateNode = useNodeStore((state) => state.updateNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)
  const tasks = nodes.filter((node) => node.parent_id === place.id && (node.kind === 'task' || node.kind == null))
  const allowed = canCreateTask(place, nodes)
  const addLabel = place.kind === 'project' ? 'Add module' : 'Add submodule'

  async function addTask() {
    if (!allowed) {
      toast({
        title: 'Tasks unlock in Execute',
        description: 'Finish the earlier stages first, or use emergency skip.',
      })
      return
    }
    try {
      const created = await createNode({ parent_id: place.id, kind: 'task', title: 'New work item' })
      requestTitleFocus(created.id)
    } catch (error) {
      toast({
        title: 'Could not add work item',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6" data-testid="execute-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Do</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{place.title}</h1>
          {place.break_glass?.used && <p className="mt-1 text-xs font-medium text-amber-700">Emergency skip used</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" data-testid="place-details" onClick={() => openPanel(place.id)}>
            Details
          </Button>
          <Button type="button" variant="secondary" data-testid="add-module" onClick={onAddChild}>
            {addLabel}
          </Button>
          <Button type="button" data-testid="add-work-item" disabled={!allowed} onClick={() => void addTask()}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add work item
          </Button>
        </div>
      </div>
      {!allowed && (
        <p className="text-sm text-muted-foreground">Tasks unlock in Execute. Finish the earlier stages first.</p>
      )}
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/86 px-4 py-3">
              <input
                type="checkbox"
                checked={task.completed}
                aria-label={`Complete ${task.title}`}
                onChange={() => void updateNode(task.id, { completed: !task.completed })}
              />
              <button
                type="button"
                className={cn('flex-1 text-left text-sm', task.completed && 'text-muted-foreground line-through')}
                onClick={() => openPanel(task.id)}
              >
                {task.title}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && allowed && (
        <p className="text-sm text-muted-foreground">No work items yet. Add the first slice with a definition of done.</p>
      )}
    </div>
  )
}
