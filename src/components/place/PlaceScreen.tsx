'use client'

import { useEffect } from 'react'
import { MindmapCanvas } from '@/components/canvas/MindmapCanvas'
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { SlideOutPanel } from '@/components/panel/SlideOutPanel'
import { ForgottenCard } from '@/components/place/ForgottenCard'
import { NowList } from '@/components/place/NowList'
import { PlaceBreadcrumb } from '@/components/place/PlaceBreadcrumb'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'
import { pickForgotten, rankNow, visibleChildren } from '@/lib/place/placeModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'

export function PlaceScreen() {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const loading = useNodeStore((state) => state.loading)
  const error = useNodeStore((state) => state.error)
  const markVisited = useNodeStore((state) => state.markVisited)
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
  const showDone = useUIStore((state) => state.showDone)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const resetPlace = useUIStore((state) => state.resetPlace)
  const selectNode = useUIStore((state) => state.selectNode)

  useKeyboardNav()

  useEffect(() => {
    resetPlace()
  }, [resetPlace])

  useEffect(() => {
    if (nodes.length === 0) return
    const root = nodes.find((node) => node.parent_id === null)
    if (!root) return
    const standing = useUIStore.getState().currentPlaceId
    if (standing === null || !nodes.some((node) => node.id === standing)) {
      enterPlace(root.id)
    }
  }, [enterPlace, nodes])

  useEffect(() => {
    if (!currentPlaceId) return
    if (useUIStore.getState().currentPlaceId !== currentPlaceId) return

    let cancelled = false
    const placeId = currentPlaceId

    markVisited(placeId).catch(() =>
      markVisited(placeId).catch(() => {
        if (!cancelled) {
          toast({ title: 'Could not save visit', variant: 'destructive' })
        }
      }),
    )

    return () => {
      cancelled = true
    }
  }, [currentPlaceId, markVisited, toast])

  const clock = new Date()
  const current = nodes.find((node) => node.id === currentPlaceId)
  const isRootPlace = Boolean(current && current.parent_id === null)

  const nowRanked = currentPlaceId
    ? rankNow(nodes, currentPlaceId, clock)
    : { items: [] as typeof nodes, overflow: 0 }

  const forgotten = currentPlaceId
    ? pickForgotten(nodes, currentPlaceId, clock, new Set(nowRanked.items.map((item) => item.id)))
    : null

  const childViews = currentPlaceId ? visibleChildren(nodes, currentPlaceId, showDone, clock, clock) : []
  const forgottenStaleDays = childViews.find((view) => view.node.id === forgotten?.id)?.staleDays
  const showEmptyPrompt = !loading && Boolean(currentPlaceId) && childViews.length === 0

  function handleNowPick(id: string) {
    const item = nodes.find((node) => node.id === id)
    if (!item) return
    if (item.parent_id) enterPlace(item.parent_id)
    selectNode(item.id)
  }

  return (
    <div className="grid h-screen w-screen grid-cols-[18rem_minmax(0,1fr)] overflow-hidden">
      <aside className="flex w-72 flex-col gap-4 overflow-y-auto border-r bg-background p-4">
        <NowList items={nowRanked.items} overflow={nowRanked.overflow} onPick={handleNowPick} />
        <ForgottenCard
          node={forgotten}
          staleDays={forgottenStaleDays}
          onOpen={() => {
            if (forgotten) enterPlace(forgotten.id)
          }}
        />
      </aside>
      <div className="relative min-h-0 min-w-0">
        <MindmapCanvas />
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-2">
          <div className="pointer-events-auto">
            <PlaceBreadcrumb />
          </div>
          <div className="pointer-events-auto">
            <CanvasToolbar loading={loading} error={error} />
          </div>
        </div>
        {showEmptyPrompt && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card/95 px-5 py-4 text-center shadow-lg">
            <p className="font-medium text-muted-foreground">
              {isRootPlace ? 'Add a project' : 'Add a child'}
            </p>
          </div>
        )}
        <SlideOutPanel />
        <CommandPalette />
      </div>
    </div>
  )
}
