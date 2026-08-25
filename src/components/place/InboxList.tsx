'use client'

import { ArrowRight, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/lib/store/useUIStore'
import type { NodeRecord } from '@/types'

interface InboxListProps {
  items: NodeRecord[]
  overflow: number
  onEnterInbox: () => void
}

export function InboxList({ items, overflow, onEnterInbox }: InboxListProps) {
  const filingNodeId = useUIStore((state) => state.filingNodeId)
  const startFilingNode = useUIStore((state) => state.startFilingNode)
  const cancelFilingNode = useUIStore((state) => state.cancelFilingNode)

  if (items.length === 0) return null

  return (
    <>
      <section className="rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(234,244,255,0.92))] p-4 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.7)] backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
          <Inbox className="h-3.5 w-3.5" />
          Inbox
        </div>

        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-sky-100/90 bg-white/75 px-3 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-medium leading-snug text-card-foreground">{item.title}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={filingNodeId === item.id ? 'default' : 'secondary'}
                  onClick={() => (filingNodeId === item.id ? cancelFilingNode() : startFilingNode(item.id))}
                >
                  {filingNodeId === item.id ? 'Cancel' : 'File'}
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-col items-start gap-1">
          {overflow > 0 && (
            <Button type="button" variant="ghost" className="h-auto px-0 text-xs text-muted-foreground" onClick={onEnterInbox}>
              {overflow} more in Inbox
            </Button>
          )}
          <Button type="button" variant="ghost" className="h-auto px-0 text-sm font-medium text-sky-700" onClick={onEnterInbox}>
            Enter Inbox
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </>
  )
}