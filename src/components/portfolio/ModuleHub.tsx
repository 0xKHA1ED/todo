'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasChildModules, trafficLight } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { NodeRecord } from '@/types'

const LIGHT: Record<string, string> = {
  complete: 'bg-emerald-400',
  in_progress: 'bg-amber-400',
  not_started: 'bg-slate-300',
  locked: 'bg-slate-200',
}

interface ModuleHubProps {
  place: NodeRecord
  onAddChild: () => void
}

export function ModuleHub({ place, onAddChild }: ModuleHubProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const filingNodeId = useUIStore((state) => state.filingNodeId)
  const cancelFilingNode = useUIStore((state) => state.cancelFilingNode)

  const children = nodes.filter(
    (node) => node.parent_id === place.id && (node.kind === 'module' || node.kind === 'project') && !node.completed,
  )

  async function openChild(child: NodeRecord) {
    if (filingNodeId) {
      try {
        await reparentNode(filingNodeId, child.id)
        cancelFilingNode()
      } catch (error) {
        toast({
          title: 'Tasks unlock in Execute',
          description:
            error instanceof Error
              ? error.message
              : 'Choose a leaf project or module in Execute, or use emergency skip from its workflow screen.',
        })
      }
      return
    }
    enterPlace(child.id)
  }

  const addLabel = place.kind === 'domain' ? 'Add project' : place.kind === 'project' ? 'Add module' : 'Add submodule'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8" data-testid="module-hub">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Hub</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{place.title}</h1>
        {place.outcome.trim() ? <p className="mt-2 text-sm text-muted-foreground">{place.outcome}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children.map((child) => {
          const nested = nodes.filter((node) => node.parent_id === child.id && node.kind === 'module').length
          const container = hasChildModules(nodes, child.id)
          const light = trafficLight(child.workflow_stage ?? 'problem', child.workflow_stage, child.stage_status)
          return (
            <button
              key={child.id}
              type="button"
              data-testid="hub-card"
              onClick={() => void openChild(child)}
              className="flex min-h-[8rem] flex-col rounded-[1.4rem] border border-white/80 bg-white/86 p-4 text-left shadow-[0_20px_65px_-42px_rgba(15,23,42,0.8)] backdrop-blur-xl transition hover:border-sky-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{child.title}</h2>
                {child.break_glass?.used && <span className="text-[11px] font-medium text-amber-700">Skip</span>}
              </div>
              {container ? (
                <p className="mt-auto pt-6 text-xs text-slate-500">
                  {nested} {nested === 1 ? 'submodule' : 'submodules'}
                </p>
              ) : (
                <p className="mt-auto flex items-center gap-2 pt-6 text-xs text-slate-500">
                  <span className={cn('h-2.5 w-2.5 rounded-full', LIGHT[light])} />
                  {child.workflow_stage ?? 'problem'}
                </p>
              )}
            </button>
          )
        })}
        <Button
          type="button"
          variant="secondary"
          className="flex min-h-[8rem] flex-col rounded-[1.4rem] border border-dashed border-slate-300 bg-white/50 text-slate-600"
          onClick={onAddChild}
        >
          <Plus className="mb-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {children.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Add a module to start thinking</p>
      )}
    </div>
  )
}
