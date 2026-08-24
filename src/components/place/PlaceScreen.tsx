'use client'

import { useEffect } from 'react'
import { MindmapCanvas } from '@/components/canvas/MindmapCanvas'
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar'
import { QuickCaptureDialog } from '@/components/capture/QuickCaptureDialog'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { SlideOutPanel } from '@/components/panel/SlideOutPanel'
import { ForgottenCard } from '@/components/place/ForgottenCard'
import { InboxList } from '@/components/place/InboxList'
import { LensList } from '@/components/place/LensList'
import { LensPicker } from '@/components/place/LensPicker'
import { NowList } from '@/components/place/NowList'
import { PlaceBreadcrumb } from '@/components/place/PlaceBreadcrumb'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'
import { getInboxId, listInboxItems } from '@/lib/inbox/inboxModel'
import { getLensById, rankLensItems } from '@/lib/place/contextLenses'
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
  const openPanel = useUIStore((state) => state.openPanel)
  const isQuickCaptureOpen = useUIStore((state) => state.isQuickCaptureOpen)
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen)
  const activeLensId = useUIStore((state) => state.activeLensId)
  const setActiveLensId = useUIStore((state) => state.setActiveLensId)

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
  const root = nodes.find((node) => node.parent_id === null) ?? null
  const current = nodes.find((node) => node.id === currentPlaceId)
  const isRootPlace = Boolean(current && current.parent_id === null)
  const inboxId = getInboxId(nodes)
  const inboxItems = inboxId ? listInboxItems(nodes, inboxId) : { items: [], overflow: 0 }
  const activeLens = isRootPlace && activeLensId ? getLensById(activeLensId) ?? null : null
  const lensRanked = root && activeLens ? rankLensItems(nodes, root.id, activeLens.id, clock) : { items: [], overflow: 0 }
  const lensMode = Boolean(activeLens)

  const nowRanked = currentPlaceId
    ? rankNow(nodes, currentPlaceId, clock)
    : { items: [], overflow: 0 }

  const forgotten = currentPlaceId
    ? pickForgotten(nodes, currentPlaceId, clock, new Set(nowRanked.items.map((item) => item.node.id)))
    : null

  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const childViews = currentPlaceId ? visibleChildren(nodes, currentPlaceId, showDone, clock, clock) : []
  const projectViews = isRootPlace ? childViews.filter((view) => view.node.system_role !== 'inbox') : childViews
  const forgottenStaleDays = forgotten
    ? forgotten.last_visited_at === null
      ? -1
      : Math.max(0, Math.floor((clock.getTime() - Date.parse(forgotten.last_visited_at)) / 86_400_000))
    : null
  const forgottenPath = forgotten
    ? (() => {
        const path: string[] = []
        let currentId = forgotten.parent_id

        while (currentId) {
          const currentNode = nodesById.get(currentId)
          if (!currentNode) break
          if (currentNode.parent_id !== null) path.unshift(currentNode.title)
          currentId = currentNode.parent_id
        }

        return path.join(' / ') || 'Home'
      })()
    : null
  const showEmptyPrompt = !lensMode && !loading && Boolean(currentPlaceId) && projectViews.length === 0

  function handleNowPick(id: string) {
    const item = nodes.find((node) => node.id === id)
    if (!item) return
    if (item.parent_id) enterPlace(item.parent_id)
    selectNode(item.id)
  }

  function handleForgottenOpen() {
    if (!forgotten) return

    markVisited(forgotten.id).catch(() => undefined)
    if (forgotten.parent_id) {
      enterPlace(forgotten.parent_id)
      window.requestAnimationFrame(() => openPanel(forgotten.id))
      return
    }

    openPanel(forgotten.id)
  }

  function handleLensPick(nodeId: string) {
    const item = nodes.find((node) => node.id === nodeId)
    if (!item) return

    if (item.parent_id) {
      enterPlace(item.parent_id)
      window.requestAnimationFrame(() => {
        selectNode(item.id)
        openPanel(item.id)
      })
      return
    }

    selectNode(item.id)
    openPanel(item.id)
  }

  return (
    <div className="grid h-screen w-screen grid-cols-[20rem_minmax(0,1fr)] overflow-hidden bg-[linear-gradient(135deg,rgba(239,244,247,1),rgba(228,236,244,0.96)_48%,rgba(220,231,239,1))]">
      <aside className="relative flex w-80 flex-col gap-4 overflow-y-auto border-r border-white/35 bg-white/45 p-4 backdrop-blur-2xl">
        {lensMode && activeLens ? (
          <LensList lens={activeLens} items={lensRanked.items} overflow={lensRanked.overflow} onPick={handleLensPick} />
        ) : (
          <>
            {isRootPlace && inboxId && inboxItems.items.length > 0 && (
              <InboxList items={inboxItems.items} overflow={inboxItems.overflow} onEnterInbox={() => enterPlace(inboxId)} />
            )}
            <NowList items={nowRanked.items} overflow={nowRanked.overflow} onPick={handleNowPick} />
            <ForgottenCard
              node={forgotten}
              staleDays={forgottenStaleDays}
              pathLabel={forgottenPath}
              onOpen={handleForgottenOpen}
            />
          </>
        )}
      </aside>
      <div className="relative min-h-0 min-w-0">
        {lensMode ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-xl rounded-[2rem] border border-white/80 bg-white/86 px-8 py-7 text-center shadow-[0_28px_90px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Lens mode</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{activeLens?.label} across your life</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Pick a task from the left to jump into its parent place without reopening the full map.
              </p>
            </div>
          </div>
        ) : (
          <MindmapCanvas />
        )}
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-3">
          <div className="pointer-events-auto">
            <PlaceBreadcrumb />
          </div>
          {isRootPlace && (
            <div className="pointer-events-auto">
              <LensPicker activeLensId={activeLensId} onToggle={setActiveLensId} />
            </div>
          )}
          <div className="pointer-events-auto">
            <CanvasToolbar loading={loading} error={error} />
          </div>
        </div>
        {showEmptyPrompt && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-[1.7rem] border border-white/75 bg-white/86 px-6 py-5 text-center shadow-[0_28px_90px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              {isRootPlace ? 'Add a project' : 'Add a child'}
            </p>
          </div>
        )}
        <SlideOutPanel />
        <CommandPalette />
        <QuickCaptureDialog open={isQuickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
      </div>
    </div>
  )
}
