'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/utils'

export function PlaceBreadcrumb() {
  const nodes = useNodeStore((state) => state.nodes)
  const getAncestors = useNodeStore((state) => state.getAncestors)
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const openPanel = useUIStore((state) => state.openPanel)

  const root = nodes.find((node) => node.parent_id === null)
  const current = nodes.find((node) => node.id === currentPlaceId)
  const atRoot = !current || current.parent_id === null
  const parentId = current?.parent_id ?? null
  const ancestors = currentPlaceId ? getAncestors(currentPlaceId) : []
  const trail = [
    ...ancestors.filter((node) => node.parent_id !== null),
    ...(current && !atRoot ? [current] : []),
  ]

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 rounded-full border border-white/75 bg-white/78 p-1.5 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.8)] backdrop-blur-xl"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={!parentId}
        onClick={() => {
          if (parentId) enterPlace(parentId)
        }}
      >
        Back
      </Button>
      {root && (
        <ol className="flex min-w-0 items-center gap-0.5">
          <li>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-current={atRoot ? 'page' : undefined}
              className={cn(atRoot && 'font-semibold')}
              onClick={() => {
                if (atRoot) openPanel(root.id)
                else enterPlace(root.id)
              }}
            >
              Home
            </Button>
          </li>
          {trail.map((node, index) => {
            const isCurrent = index === trail.length - 1
            return (
              <li key={node.id} className="flex min-w-0 items-center gap-0.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn('max-w-[12rem] truncate', isCurrent && 'font-semibold')}
                  onClick={() => {
                    if (isCurrent) openPanel(node.id)
                    else enterPlace(node.id)
                  }}
                >
                  {node.title}
                </Button>
              </li>
            )
          })}
        </ol>
      )}
    </nav>
  )
}
