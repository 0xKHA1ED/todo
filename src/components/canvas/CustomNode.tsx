import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/lib/store/useUIStore'
import { formatDate } from '@/lib/utils'
import type { FlowNode } from '@/types'

const URGENCY_BORDER = {
  low: 'border-urgency-low shadow-urgency-low/10',
  normal: 'border-urgency-normal shadow-urgency-normal/10',
  high: 'border-urgency-high shadow-urgency-high/10',
}

export const CustomNode = memo(({ id, data }: NodeProps<FlowNode>) => {
  const openPanel = useUIStore((state) => state.openPanel)

  return (
    <button
      type="button"
      onClick={() => openPanel(id)}
      className={`mindmap-node w-[220px] rounded-xl border-2 bg-card/95 px-4 py-3 text-left shadow-xl backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-2xl ${URGENCY_BORDER[data.urgency]}`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      <p className="truncate text-sm font-semibold leading-tight text-card-foreground">{data.title}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{data.urgency} urgency</p>

      <div className="mt-2 flex min-h-5 flex-wrap gap-1">
        {data.date && (
          <Badge variant="outline" className="border-border/80 py-0 text-[10px]">
            {formatDate(data.date)}
          </Badge>
        )}
        {data.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="py-0 text-[10px]">
            {tag}
          </Badge>
        ))}
        {data.tags.length > 3 && (
          <Badge variant="secondary" className="py-0 text-[10px]">
            +{data.tags.length - 3}
          </Badge>
        )}
      </div>
    </button>
  )
})
CustomNode.displayName = 'CustomNode'
