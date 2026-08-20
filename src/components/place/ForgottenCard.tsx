'use client'

import { Button } from '@/components/ui/button'
import type { NodeRecord } from '@/types'

interface ForgottenCardProps {
  node: NodeRecord | null
  staleDays?: number | null
  pathLabel?: string | null
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

export function ForgottenCard({ node, staleDays, pathLabel, onOpen }: ForgottenCardProps) {
  if (!node) return null

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`Forgotten ${node.title}`}
      onClick={onOpen}
      className="h-auto w-full items-start justify-start rounded-[1.7rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,244,214,0.92))] px-4 py-4 text-left shadow-[0_22px_60px_-42px_rgba(146,64,14,0.75)] transition-all hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(255,241,204,0.98))]"
    >
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">Forgotten Trail</span>
        <span className="text-base font-semibold leading-snug text-card-foreground">{node.title}</span>
        {pathLabel && <span className="text-xs font-medium uppercase tracking-[0.12em] text-amber-900/70">Inside {pathLabel}</span>}
        <span className="text-sm leading-snug text-amber-950/65">{unseenCopy(node, staleDays)}</span>
      </span>
    </Button>
  )
}
