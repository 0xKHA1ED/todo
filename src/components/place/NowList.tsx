'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { useNodeStore } from '@/lib/store/useNodeStore'
import type { RankedNowItem } from '@/lib/place/placeModel'

interface NowListProps {
  items: RankedNowItem[]
  overflow: number
  onPick: (id: string) => void
}

export function NowList({ items, overflow, onPick }: NowListProps) {
  const nodes = useNodeStore((state) => state.nodes)

  if (items.length === 0) return null

  function priorityCopy(item: RankedNowItem) {
    if (item.bucket === 'overdue') {
      const overdueDays = Math.abs(item.daysUntil ?? 0)
      return overdueDays <= 1 ? 'Overdue' : `${overdueDays}d overdue`
    }
    if (item.bucket === 'today') return 'Due today'
    if (item.bucket === 'soon') {
      if (item.daysUntil === 1) return 'Due tomorrow'
      return `Due in ${item.daysUntil}d`
    }
    return 'High priority'
  }

  function priorityClasses(item: RankedNowItem) {
    if (item.bucket === 'overdue') {
      return {
        button: 'border-rose-200 bg-rose-50/90 hover:bg-rose-100',
        badge: 'border-rose-200 bg-rose-100 text-rose-700',
      }
    }
    if (item.bucket === 'today') {
      return {
        button: 'border-amber-200 bg-amber-50/90 hover:bg-amber-100',
        badge: 'border-amber-200 bg-amber-100 text-amber-800',
      }
    }
    if (item.bucket === 'soon') {
      return {
        button: 'border-sky-200 bg-sky-50/80 hover:bg-sky-100',
        badge: 'border-sky-200 bg-sky-100 text-sky-700',
      }
    }
    return {
      button: 'border-fuchsia-200 bg-fuchsia-50/80 hover:bg-fuchsia-100',
      badge: 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700',
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Now</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const parent = nodes.find((node) => node.id === item.node.parent_id)
          const priority = priorityClasses(item)
          return (
            <li key={item.node.id}>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'h-auto w-full justify-start rounded-xl border px-3 py-2 text-left shadow-sm transition-colors',
                  priority.button,
                )}
                onClick={() => onPick(item.node.id)}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium text-card-foreground">{item.node.title}</span>
                    <Badge variant="outline" className={cn('shrink-0 font-medium', priority.badge)}>
                      {priorityCopy(item)}
                    </Badge>
                  </span>
                  {parent && (
                    <span className="truncate text-xs text-muted-foreground">{parent.title}</span>
                  )}
                  {item.node.date && (
                    <span className="text-xs font-medium text-muted-foreground">{formatDate(item.node.date)}</span>
                  )}
                </span>
              </Button>
            </li>
          )
        })}
      </ul>
      {overflow > 0 && <p className="mt-2 text-xs text-muted-foreground">{overflow} more</p>}
    </section>
  )
}
