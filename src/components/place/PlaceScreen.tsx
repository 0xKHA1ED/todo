'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MindmapCanvas } from '@/components/canvas/MindmapCanvas'
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar'
import { QuickCaptureDialog } from '@/components/capture/QuickCaptureDialog'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { MoveNodeDialog } from '@/components/panel/MoveNodeDialog'
import { SlideOutPanel } from '@/components/panel/SlideOutPanel'
import { InboxSheet } from '@/components/place/InboxSheet'
import { LensList } from '@/components/place/LensList'
import { NowList } from '@/components/place/NowList'
import { PlaceHeader } from '@/components/place/PlaceHeader'
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard'
import { ModuleHub } from '@/components/portfolio/ModuleHub'
import { ExecuteList } from '@/components/workflow/ExecuteList'
import { ModuleDashboard } from '@/components/workflow/ModuleDashboard'
import { StageStrip } from '@/components/workflow/StageStrip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'
import { isContainerConversionError } from '@/lib/life-pm/errors'
import { canCreateTask, isWorkflowLeaf } from '@/lib/life-pm/workflowModel'
import { getInboxId } from '@/lib/inbox/inboxModel'
import { getLensById, rankLensItems } from '@/lib/place/contextLenses'
import { rankNow } from '@/lib/place/placeModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeKind, WorkflowStage } from '@/types'

export function PlaceScreen() {
  const { toast } = useToast()
  const [moveDialogNodeId, setMoveDialogNodeId] = useState<string | null>(null)
  const [containerConfirm, setContainerConfirm] = useState<{ kind: NodeKind } | null>(null)
  const previousStageRef = useRef<WorkflowStage | null | undefined>(undefined)
  const nodes = useNodeStore((state) => state.nodes)
  const loading = useNodeStore((state) => state.loading)
  const error = useNodeStore((state) => state.error)
  const createNode = useNodeStore((state) => state.createNode)
  const markVisited = useNodeStore((state) => state.markVisited)
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
  const viewMode = useUIStore((state) => state.viewMode)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const setViewMode = useUIStore((state) => state.setViewMode)
  const selectNode = useUIStore((state) => state.selectNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const isQuickCaptureOpen = useUIStore((state) => state.isQuickCaptureOpen)
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen)
  const filingNodeId = useUIStore((state) => state.filingNodeId)
  const cancelFilingNode = useUIStore((state) => state.cancelFilingNode)
  const activeLensId = useUIStore((state) => state.activeLensId)
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)

  useKeyboardNav()

  useEffect(() => {
    if (nodes.length === 0) return
    const root = nodes.find((node) => node.parent_id === null)
    if (!root) return
    const standing = useUIStore.getState().currentPlaceId
    if (standing === null || !nodes.some((node) => node.id === standing)) {
      enterPlace(root.id)
      return
    }
    useUIStore.getState().syncViewMode()
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

  const place = nodes.find((node) => node.id === currentPlaceId) ?? null
  const root = nodes.find((node) => node.parent_id === null) ?? null
  const atRoot = Boolean(place && place.parent_id === null)
  const inboxId = getInboxId(nodes)
  const leaf = place ? isWorkflowLeaf(place, nodes) : false

  useEffect(() => {
    const current = place?.workflow_stage
    if (place && previousStageRef.current !== current && current === 'execute') {
      setViewMode('list')
    }
    previousStageRef.current = current
  }, [place?.id, place?.workflow_stage, setViewMode])

  const lens = atRoot && activeLensId ? getLensById(activeLensId) ?? null : null
  const lensItems = root && lens ? rankLensItems(nodes, root.id, lens.id, new Date()) : { items: [], overflow: 0 }
  const nowRanked = currentPlaceId && leaf && place?.workflow_stage === 'execute'
    ? rankNow(nodes, currentPlaceId, new Date())
    : { items: [], overflow: 0 }

  const filingNode = nodes.find((node) => node.id === filingNodeId) ?? null

  async function createChild(kind: NodeKind, confirmContainer = false) {
    if (!currentPlaceId) return
    try {
      const node = await createNode({ parent_id: currentPlaceId, kind, confirmContainer })
      requestTitleFocus(node.id)
    } catch (caught) {
      if (isContainerConversionError(caught)) {
        setContainerConfirm({ kind })
        return
      }
      toast({
        title: 'Could not create',
        description: caught instanceof Error ? caught.message : 'Could not create a node.',
        variant: 'destructive',
      })
    }
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

  function handleNowPick(id: string) {
    const item = nodes.find((node) => node.id === id)
    if (!item) return
    if (item.parent_id) enterPlace(item.parent_id)
    selectNode(item.id)
    openPanel(item.id)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[linear-gradient(135deg,rgba(239,244,247,1),rgba(228,236,244,0.96)_48%,rgba(220,231,239,1))]">
      <PlaceHeader />
      {filingNode && (
        <div className="flex items-center gap-3 border-b border-sky-200/80 bg-sky-50/90 px-4 py-2">
          <p className="min-w-0 flex-1 text-sm text-slate-800">
            Filing &ldquo;{filingNode.title}&rdquo; — open a project or module, then file here when it is in Execute.
          </p>
          {place && canCreateTask(place, nodes) && (
            <Button
              size="sm"
              data-testid="file-here"
              onClick={() => {
                void useNodeStore
                  .getState()
                  .reparentNode(filingNode.id, place.id)
                  .then(() => cancelFilingNode())
                  .catch((error) => {
                    toast({
                      title: 'Tasks unlock in Execute',
                      description: error instanceof Error ? error.message : 'Could not file this task here.',
                    })
                  })
              }}
            >
              File here
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMoveDialogNodeId(filingNode.id)
              cancelFilingNode()
            }}
          >
            Search
          </Button>
          <Button size="sm" variant="secondary" onClick={cancelFilingNode}>
            Cancel
          </Button>
        </div>
      )}

      {leaf && place && (
        <div className="flex items-center gap-2 border-b border-white/40 bg-white/40 px-4 py-2">
          <Button size="sm" variant={viewMode === 'think' ? 'default' : 'secondary'} onClick={() => setViewMode('think')}>
            Overview
          </Button>
          <Button size="sm" variant={viewMode === 'list' ? 'default' : 'secondary'} onClick={() => setViewMode('list')}>
            List
          </Button>
          <Button size="sm" variant={viewMode === 'map' ? 'default' : 'secondary'} onClick={() => setViewMode('map')}>
            Map
          </Button>
          {viewMode !== 'think' && (
            <div className="ml-auto">
              <StageStrip
                node={place}
                activeStage={(place.workflow_stage ?? 'problem') as WorkflowStage}
                onSelect={() => setViewMode('think')}
              />
            </div>
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {lens ? (
          <div className="grid h-full grid-cols-[20rem_minmax(0,1fr)]">
            <div className="overflow-y-auto border-r border-white/35 bg-white/45 p-4">
              <LensList lens={lens} items={lensItems.items} overflow={lensItems.overflow} onPick={handleLensPick} />
            </div>
            <div className="flex items-center justify-center p-8">
              <div className="max-w-xl rounded-[2rem] border border-white/80 bg-white/86 px-8 py-7 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Lens mode</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{lens.label} across your life</h2>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0">
            {viewMode === 'list' && nowRanked.items.length > 0 && (
              <aside className="w-80 overflow-y-auto border-r border-white/35 bg-white/45 p-4">
                <NowList items={nowRanked.items} overflow={nowRanked.overflow} onPick={handleNowPick} />
              </aside>
            )}
            <div className="relative min-h-0 min-w-0 flex-1 overflow-auto">
              {viewMode === 'portfolio' && (
                <PortfolioDashboard
                  onCreateDomain={() => {
                    if (!root) return
                    void createNode({ parent_id: root.id, kind: 'domain' }).then((node) => requestTitleFocus(node.id))
                  }}
                  onCreateProject={(parentId) => {
                    if (!root) return
                    void createNode({ parent_id: parentId ?? root.id, kind: 'project' }).then((node) =>
                      requestTitleFocus(node.id),
                    )
                  }}
                />
              )}
              {viewMode === 'hub' && place && (
                <ModuleHub
                  place={place}
                  onAddChild={() =>
                    void createChild(place.kind === 'domain' ? 'project' : 'module')
                  }
                />
              )}
              {viewMode === 'think' && place && (
                <ModuleDashboard
                  place={place}
                  onAddChild={() => void createChild(place.kind === 'domain' ? 'project' : 'module')}
                />
              )}
              {viewMode === 'list' && place && (
                <ExecuteList
                  place={place}
                  onAddChild={() => void createChild(place.kind === 'domain' ? 'project' : 'module')}
                />
              )}
              {viewMode === 'map' && (
                <>
                  <MindmapCanvas />
                  <div className="pointer-events-none absolute left-4 top-4 z-20">
                    <div className="pointer-events-auto">
                      <CanvasToolbar loading={loading} error={error} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {inboxId && <InboxSheet inboxId={inboxId} />}
      <SlideOutPanel />
      <MoveNodeDialog nodeId={moveDialogNodeId} open={moveDialogNodeId !== null} onOpenChange={(open) => !open && setMoveDialogNodeId(null)} />
      <CommandPalette />
      <QuickCaptureDialog open={isQuickCaptureOpen} onOpenChange={setQuickCaptureOpen} />

      <Dialog open={containerConfirm !== null} onOpenChange={(open) => !open && setContainerConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Become a grouping folder?</DialogTitle>
            <DialogDescription>
              This module will become a grouping folder; workflow moves to children.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setContainerConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const kind = containerConfirm?.kind
                setContainerConfirm(null)
                if (kind) void createChild(kind, true)
              }}
            >
              Add {containerConfirm?.kind === 'project' ? 'project' : place?.kind === 'project' ? 'module' : 'submodule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
