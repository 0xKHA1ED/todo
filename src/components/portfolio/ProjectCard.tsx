'use client'

import { cn } from '@/lib/utils'
import { PlaceActions } from '@/components/place/PlaceActions'
import type { Health, PmStatus, TrafficLight, WorkflowStage } from '@/types'

const STATUS_LABEL: Record<PmStatus, string> = {
  idea: 'Idea',
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
}

const HEALTH_BORDER: Record<Health, string> = {
  on_track: 'border-l-transparent',
  at_risk: 'border-l-amber-400',
  stalled: 'border-l-slate-400',
  blocked: 'border-l-rose-500',
}

const STAGE_LABEL: Record<WorkflowStage, string> = {
  problem: 'Problem',
  shape: 'Shape',
  plan: 'Plan',
  spec: 'Spec',
  execute: 'Execute',
  review: 'Review',
}

const STAGE_DOT: Record<TrafficLight, string> = {
  complete: 'bg-emerald-400',
  in_progress: 'bg-amber-400',
  not_started: 'bg-slate-300',
  locked: 'bg-slate-300',
}

interface ProjectCardProps {
  id: string
  title: string
  status: PmStatus
  health: Health | null
  outcome: string
  domainLabel?: string
  stageLabel?: WorkflowStage | null
  stageLight?: TrafficLight | null
  attentionTitle?: string | null
  breakGlass?: boolean
  onClick: () => void
}

export function ProjectCard({
  id,
  title,
  status,
  health,
  outcome,
  domainLabel,
  stageLabel,
  stageLight,
  attentionTitle,
  breakGlass,
  onClick,
}: ProjectCardProps) {
  return (
    <div
      data-testid="project-card"
      className={cn(
        'relative flex min-h-[9.5rem] flex-col rounded-[1.4rem] border border-white/80 bg-white/86 p-4 text-left shadow-[0_20px_65px_-42px_rgba(15,23,42,0.8)] backdrop-blur-xl transition hover:border-sky-200 hover:bg-white',
        'border-l-[3px]',
        health ? HEALTH_BORDER[health] : 'border-l-transparent',
      )}
    >
      <div className="absolute right-2 top-2">
        <PlaceActions nodeId={id} title={title} />
      </div>
      <button type="button" className="flex min-h-[8.5rem] flex-1 flex-col text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-3 pr-16">
          <div className="min-w-0">
            {domainLabel && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{domainLabel}</p>}
            <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {stageLabel && stageLight ? <span className={cn('h-2 w-2 rounded-full', STAGE_DOT[stageLight])} /> : null}
            {stageLabel ? `${STAGE_LABEL[stageLabel]} · ${STATUS_LABEL[status]}` : STATUS_LABEL[status]}
          </span>
        </div>
        {outcome.trim() ? (
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{outcome}</p>
        ) : (
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground/70">No outcome yet</p>
        )}
        <div className="mt-auto pt-4">
          {breakGlass && <p className="text-[11px] font-medium text-amber-700">Emergency skip used</p>}
          {attentionTitle ? <p className="text-xs text-slate-400">{attentionTitle}</p> : null}
        </div>
      </button>
    </div>
  )
}
