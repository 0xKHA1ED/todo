'use client'

import { Inbox, Search } from 'lucide-react'
import { PlaceBreadcrumb } from '@/components/place/PlaceBreadcrumb'
import { Button } from '@/components/ui/button'
import { getInboxId, listInboxItems } from '@/lib/inbox/inboxModel'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

export function PlaceHeader() {
  const nodes = useNodeStore((state) => state.nodes)
  const setInboxOpen = useUIStore((state) => state.setInboxOpen)
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen)
  const inboxId = getInboxId(nodes)
  const count = inboxId ? listInboxItems(nodes, inboxId).items.length : 0

  return (
    <header className="flex items-center gap-3 border-b border-white/40 bg-white/50 px-4 py-3 backdrop-blur-xl">
      <p className="hidden shrink-0 text-sm font-semibold tracking-tight text-slate-800 sm:block">Life PM</p>
      <div className="min-w-0 flex-1">
        <PlaceBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        {inboxId && (
          <Button type="button" size="sm" variant="secondary" data-testid="inbox-badge" onClick={() => setInboxOpen(true)}>
            <Inbox className="mr-2 h-3.5 w-3.5" />
            Inbox{count > 0 ? ` · ${count}` : ''}
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => toggleCommandPalette(true)}>
          <Search className="mr-2 h-3.5 w-3.5" />
          ⌘K
        </Button>
        <Button type="button" size="sm" onClick={() => setQuickCaptureOpen(true)}>
          C
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void useAuthStore.getState().signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
