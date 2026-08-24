'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ContextLens, RankedLensItem } from '@/lib/place/contextLenses'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { formatDate } from '@/lib/utils'

interface LensListProps {
  lens: ContextLens
  items: RankedLensItem[]
  overflow: number
  onPick: (nodeId: string) => void
}

function bucketCopy(item: RankedLensItem) {
  if (item.bucket === 'overdue') {
    const overdueDays = Math.abs(item.daysUntil ?? 0)
    return overdueDays <= 1 ? 'Overdue' : `${overdueDays}d overdue`
  }

  if (item.bucket === 'today') return 'Due today'
  if (item.bucket === 'soon') return item.daysUntil === 1 ? 'Due tomorrow' : `Due in ${item.daysUntil}d`
  if (item.bucket === 'high') return 'High priority'
  if (item.node.date) return formatDate(item.node.date)

  return 'Open'
}

export function LensList({ lens, items, overflow, onPick }: LensListProps) {
  const getAncestors = useNodeStore((state) => state.getAncestors)

  return (
    <section className="rounded-[1.7rem] border border-white/70 bg-white/72 p-4 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.7)] backdrop-blur-xl">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{lens.label}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No open tasks tagged {lens.tag}. Add #{lens.tag} to a tag field or quick capture.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const ancestors = getAncestors(item.node.id).filter((ancestor) => ancestor.parent_id !== null)
            const parentPath = ancestors.map((ancestor) => ancestor.title).join(' / ') || 'Home'

            return (
              <li key={item.node.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
                  onClick={() => onPick(item.node.id)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug text-card-foreground">{item.node.title}</span>
                      <Badge variant="outline" className="shrink-0 font-medium">
                        {bucketCopy(item)}
                      </Badge>
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">{parentPath}</span>
                  </span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {overflow > 0 && <p className="mt-2 text-xs text-muted-foreground">{overflow} more tagged {lens.tag}</p>}
    </section>
  )
}