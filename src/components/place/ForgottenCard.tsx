'use client'

import { Button } from '@/components/ui/button'
import type { NodeRecord } from '@/types'

interface ForgottenCardProps {
  node: NodeRecord | null
  staleDays?: number | null
  onOpen: () => void
}

function unseenCopy(node: NodeRecord, staleDays?: number | null) {
  if (!node.last_visited_at) return 'Never opened'
  const days =
    staleDays != null && staleDays >= 0
      ? staleDays
      : Math.floor((Date.now() - Date.parse(node.last_visited_at)) / 86_400_000)
  if (days <= 0) return 'Last opened today'
  if (days === 1) return 'Last opened 1 day ago'
  return `Unseen for ${days} days`
}

export function ForgottenCard({ node, staleDays, onOpen }: ForgottenCardProps) {
  if (!node) return null

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`Forgotten ${node.title}`}
      onClick={onOpen}
      className="h-auto w-full items-start justify-start rounded-2xl border border-dashed border-amber-500/80 bg-card px-4 py-3 text-left shadow-sm hover:bg-amber-50/60"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">Forgotten</span>
        <span className="font-semibold text-card-foreground">{node.title}</span>
        <span className="text-sm text-muted-foreground">{unseenCopy(node, staleDays)}</span>
      </span>
    </Button>
  )
}
