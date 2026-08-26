'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PromoteDialog } from '@/components/place/PromoteDialog'
import { listInboxItems } from '@/lib/inbox/inboxModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import type { NodeRecord } from '@/types'

interface InboxSheetProps {
  inboxId: string
}

export function InboxSheet({ inboxId }: InboxSheetProps) {
  const nodes = useNodeStore((state) => state.nodes)
  const isInboxOpen = useUIStore((state) => state.isInboxOpen)
  const setInboxOpen = useUIStore((state) => state.setInboxOpen)
  const filingNodeId = useUIStore((state) => state.filingNodeId)
  const startFilingNode = useUIStore((state) => state.startFilingNode)
  const cancelFilingNode = useUIStore((state) => state.cancelFilingNode)
  const [promoteItem, setPromoteItem] = useState<NodeRecord | null>(null)
  const listed = listInboxItems(nodes, inboxId)

  return (
    <>
      <Sheet open={isInboxOpen} onOpenChange={setInboxOpen}>
        <SheetContent side="right" className="w-[94vw] overflow-y-auto sm:max-w-md" data-testid="inbox-sheet">
          <SheetHeader>
            <SheetTitle>Inbox</SheetTitle>
          </SheetHeader>
          <ul className="mt-6 space-y-3">
            {listed.items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                <p className="text-sm font-medium">{item.title}</p>
                {item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={filingNodeId === item.id ? 'default' : 'secondary'}
                    onClick={() => (filingNodeId === item.id ? cancelFilingNode() : startFilingNode(item.id))}
                  >
                    {filingNodeId === item.id ? 'Cancel' : 'File as task'}
                  </Button>
                  <Button type="button" size="sm" data-testid="promote-to-project" onClick={() => setPromoteItem(item)}>
                    Promote to project
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {listed.items.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Inbox is empty.</p>}
          {listed.overflow > 0 && <p className="mt-3 text-xs text-muted-foreground">{listed.overflow} more not shown</p>}
        </SheetContent>
      </Sheet>
      <PromoteDialog item={promoteItem} open={promoteItem !== null} onOpenChange={(open) => !open && setPromoteItem(null)} />
    </>
  )
}
