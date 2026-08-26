'use client'

import { STAGE_ORDER } from '@/lib/life-pm/types'
import { trafficLight } from '@/lib/life-pm/workflowModel'
import { cn } from '@/lib/utils'
import type { NodeRecord, WorkflowStage } from '@/types'

const SHORT: Record<WorkflowStage, string> = {
  problem: 'P',
  shape: 'S',
  plan: 'Pl',
  spec: 'Sp',
  execute: 'Ex',
  review: 'Rv',
}

const FULL: Record<WorkflowStage, string> = {
  problem: 'Problem',
  shape: 'Shape',
  plan: 'Plan',
  spec: 'Spec',
  execute: 'Execute',
  review: 'Review',
}

const DOT: Record<string, string> = {
  complete: 'bg-emerald-400',
  in_progress: 'bg-amber-400',
  not_started: 'bg-slate-300',
  locked: 'bg-slate-300',
}

function unlockTitle(stage: WorkflowStage): string {
  const index = STAGE_ORDER.indexOf(stage)
  const previous = index > 0 ? STAGE_ORDER[index - 1] : null
  return previous ? `Unlocks after ${FULL[previous]}` : FULL[stage]
}

interface StageStripProps {
  node: NodeRecord
  activeStage: WorkflowStage
  onSelect: (stage: WorkflowStage) => void
}

export function StageStrip({ node, activeStage, onSelect }: StageStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="stage-strip" role="tablist" aria-label="Workflow stages">
      {STAGE_ORDER.map((stage) => {
        const light = trafficLight(stage, node.workflow_stage, node.stage_status)
        const locked = light === 'locked'
        const current = activeStage === stage
        return (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={current}
            disabled={locked}
            title={locked ? unlockTitle(stage) : FULL[stage]}
            onClick={() => onSelect(stage)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              current ? 'border-slate-900 bg-slate-900 text-white' : 'border-white/80 bg-white/80 text-slate-600',
              locked && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', DOT[light])} />
            {SHORT[stage]}
            {locked && <span aria-hidden>🔒</span>}
          </button>
        )
      })}
    </div>
  )
}
