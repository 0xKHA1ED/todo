import { memo, useMemo, type MouseEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { PanelRightOpen } from 'lucide-react'
import { getNodeSize } from '@/lib/flow/treeLayout'
import { daysUntil } from '@/lib/place/placeModel'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn, formatDate } from '@/lib/utils'
import type { FlowNode, NodeData, NodeDensity } from '@/types'

function loudDueLabel(date: string | null, today: Date): string | null {
  const until = daysUntil(date, today)
  if (until === null) return null
  if (until < 0) return 'OVERDUE'
  if (until === 0) return 'DUE TODAY'
  return null
}

function areaHints(data: NodeData): string {
  const parts = [`${data.insideCount} inside`]
  if (data.dueCount > 0) parts.push(`${data.dueCount} due`)
  if (data.staleDays === -1) parts.push('never')
  else if (data.staleDays != null) parts.push(`${data.staleDays}d`)
  return parts.join(' · ')
}

const ACCENT: Record<NodeDensity, string> = {
  loud: 'bg-rose-500',
  medium: 'bg-amber-500',
  area: 'bg-sky-500',
  compact: 'bg-slate-400',
}

export const CustomNode = memo(({ data }: NodeProps<FlowNode>) => {
  const size = useMemo(
    () => getNodeSize(data.density, data.attentionCount, data.title),
    [data.attentionCount, data.density, data.title],
  )
  const isArea = data.isArea
  const dueLabel = useMemo(() => loudDueLabel(data.date, new Date()), [data.date])
  const openPanel = useUIStore((state) => state.openPanel)
  const showProgress = isArea && !data.completed && data.totalSubtaskCount > 0

  function handleDetailsClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    openPanel(data.id)
  }

  return (
    <div
      className={cn(
        'mindmap-node group relative overflow-hidden rounded-[1.35rem] text-left shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]',
        data.density === 'loud'
          ? 'border border-rose-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.96))]'
          : data.density === 'medium'
            ? 'border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,236,0.95))]'
            : data.density === 'area'
              ? 'border border-sky-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,248,255,0.95))]'
              : 'border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))]',
        data.completed && 'border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,240,244,0.88))]',
      )}
      style={{ width: size.width, minHeight: size.height }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      {isArea && (
        <button
          type="button"
          aria-label={`Open details for ${data.title}`}
          className="absolute right-2 top-2 z-10 rounded-full border border-border/70 bg-card/95 p-1 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={handleDetailsClick}
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex h-full w-full flex-col justify-center gap-1 px-4 py-3">
        <div className="flex items-start gap-2">
          {!data.completed && (
            <span className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full ring-2 ring-white', ACCENT[data.density])} aria-hidden />
          )}
          <p
            className={cn(
              'mindmap-node-title text-[15px] font-semibold leading-snug text-card-foreground',
              data.completed && 'text-muted-foreground line-through',
            )}
          >
            {data.title}
          </p>
        </div>
        {isArea && data.density !== 'compact' && (
          <p className="pl-4 text-[11px] font-medium leading-snug text-muted-foreground">{areaHints(data)}</p>
        )}
        {!isArea && data.density === 'loud' && dueLabel && (
          <p className="pl-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">{dueLabel}</p>
        )}
        {!isArea && data.density === 'medium' && (
          <p className="pl-4 text-[11px] font-medium leading-snug text-muted-foreground">
            {data.date ? formatDate(data.date) : 'high'}
          </p>
        )}
      </div>

      {showProgress && (
        <div className="absolute inset-x-3 bottom-2 flex items-center gap-2" aria-hidden>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width] duration-500"
              style={{ width: `${data.completionPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-slate-500">{data.completionPercent}%</span>
        </div>
      )}
    </div>
  )
})
CustomNode.displayName = 'CustomNode'
