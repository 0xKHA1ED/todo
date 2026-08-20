import { memo, type MouseEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { PanelRightOpen } from 'lucide-react'
import { DENSITY_SIZE } from '@/lib/flow/treeLayout'
import { daysUntil } from '@/lib/place/placeModel'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn, formatDate } from '@/lib/utils'
import type { FlowNode, NodeData } from '@/types'

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

export const CustomNode = memo(({ data }: NodeProps<FlowNode>) => {
  const size = DENSITY_SIZE[data.density]
  const isArea = data.insideCount > 0
  const today = new Date()
  const dueLabel = loudDueLabel(data.date, today)
  const openPanel = useUIStore((state) => state.openPanel)

  function handleDetailsClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    openPanel(data.id)
  }

  return (
    <div
      className={cn(
        'mindmap-node relative overflow-hidden rounded-lg bg-card text-left',
        data.density === 'loud' ? 'border-2 border-rose-500' : 'border border-border/90',
        data.completed && 'bg-card/80',
      )}
      style={{ width: size.width, height: size.height }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      {isArea && (
        <button
          type="button"
          aria-label={`Open details for ${data.title}`}
          className="absolute right-2 top-2 z-10 rounded-full border border-border/80 bg-card/95 p-1 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={handleDetailsClick}
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex h-full w-full flex-col justify-center px-3 py-2">
        <p
          className={cn(
            'mindmap-node-title text-[15px] font-semibold leading-snug text-card-foreground',
            data.completed && 'text-muted-foreground line-through',
            data.density === 'compact' && 'truncate',
          )}
        >
          {data.title}
        </p>
        {isArea && data.density !== 'compact' && (
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{areaHints(data)}</p>
        )}
        {!isArea && data.density === 'loud' && dueLabel && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-rose-600">{dueLabel}</p>
        )}
        {!isArea && data.density === 'medium' && (
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {data.date ? formatDate(data.date) : 'high'}
          </p>
        )}
      </div>
    </div>
  )
})
CustomNode.displayName = 'CustomNode'
