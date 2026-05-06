import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn, formatDate } from '@/lib/utils'
import type { FlowNode } from '@/types'

const URGENCY_STYLES = {
  low: {
    stripe: 'bg-urgency-low',
    progress: 'bg-urgency-low',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  normal: {
    stripe: 'bg-urgency-normal',
    progress: 'bg-urgency-normal',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  high: {
    stripe: 'bg-urgency-high',
    progress: 'bg-urgency-high',
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
  },
}

export const CustomNode = memo(({ id, data }: NodeProps<FlowNode>) => {
  const openPanel = useUIStore((state) => state.openPanel)
  const urgencyStyle = URGENCY_STYLES[data.urgency]
  const taskSummary =
    data.totalSubtaskCount > 0
      ? `${data.completedSubtaskCount}/${data.totalSubtaskCount}`
      : data.completed
        ? 'Done'
        : 'Open'

  return (
    <button
      type="button"
      onClick={() => openPanel(id)}
      className={cn(
        'mindmap-node relative h-[126px] w-[260px] overflow-hidden rounded-lg border border-border/90 bg-card text-left shadow-md transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        data.completed && 'bg-card/80',
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <span className={cn('absolute inset-y-0 left-0 w-1.5', urgencyStyle.stripe)} />

      <div className="flex h-full flex-col px-4 py-3 pl-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'mindmap-node-title text-[15px] font-semibold leading-snug text-card-foreground',
                data.completed && 'text-muted-foreground line-through',
              )}
            >
              {data.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span className={cn('rounded-md border px-1.5 py-0.5 capitalize leading-none', urgencyStyle.pill)}>
                {data.urgency}
              </span>
              {data.date && <span className="truncate">{formatDate(data.date)}</span>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold leading-none text-card-foreground">{data.completionPercent}%</p>
            <p className="mt-1 text-[10px] font-semibold uppercase leading-none text-muted-foreground">{taskSummary}</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <span
            className={cn('block h-full rounded-full', urgencyStyle.progress)}
            style={{ width: `${data.completionPercent}%` }}
          />
        </div>

        <div className="mt-2 flex h-5 min-w-0 items-center gap-1 overflow-hidden">
          {data.completed && (
            <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700">
              Done
            </Badge>
          )}
          {data.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="min-w-0 max-w-[5.75rem] truncate px-1.5 py-0 text-[10px] font-medium">
              {tag}
            </Badge>
          ))}
          {data.tags.length > 2 && (
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] font-medium">
              +{data.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
})
CustomNode.displayName = 'CustomNode'
