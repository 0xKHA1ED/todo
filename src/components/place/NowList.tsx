'use client'

import { Button } from '@/components/ui/button'
import { useNodeStore } from '@/lib/store/useNodeStore'
import type { NodeRecord } from '@/types'

interface NowListProps {
  items: NodeRecord[]
  overflow: number
  onPick: (id: string) => void
}

export function NowList({ items, overflow, onPick }: NowListProps) {
  const nodes = useNodeStore((state) => state.nodes)

  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Now</h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const parent = nodes.find((node) => node.id === item.parent_id)
          return (
            <li key={item.id}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 text-left"
                onClick={() => onPick(item.id)}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-card-foreground">{item.title}</span>
                  {parent && (
                    <span className="truncate text-xs text-muted-foreground">{parent.title}</span>
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
