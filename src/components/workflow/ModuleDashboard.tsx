'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BreakGlassDialog } from '@/components/workflow/BreakGlassDialog'
import { ImportSessionDialog } from '@/components/workflow/ImportSessionDialog'
import { SignOffButton } from '@/components/workflow/SignOffButton'
import { StageChecklist } from '@/components/workflow/StageChecklist'
import { StageDocument } from '@/components/workflow/StageDocument'
import { StageStrip } from '@/components/workflow/StageStrip'
import { Button } from '@/components/ui/button'
import { emptyStageHtml, ensureStageDoc, needsStageTemplate } from '@/lib/life-pm/stageContent'
import { buildCursorPromptForNode } from '@/lib/life-pm/promptFromNode'
import { canEditStage } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeRecord, WorkflowStage } from '@/types'

interface ModuleDashboardProps {
  place: NodeRecord
  onAddChild: () => void
}

export function ModuleDashboard({ place, onAddChild }: ModuleDashboardProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const updateNode = useNodeStore((state) => state.updateNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const [activeStage, setActiveStage] = useState<WorkflowStage>(place.workflow_stage ?? 'problem')
  const [importOpen, setImportOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const [draftHtml, setDraftHtml] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const pendingHtmlRef = useRef<string | null>(null)
  const placeRef = useRef(place)
  placeRef.current = place
  const stageRef = useRef(activeStage)
  stageRef.current = activeStage

  useEffect(() => {
    setActiveStage(place.workflow_stage ?? 'problem')
    setDraftHtml(null)
  }, [place.id, place.workflow_stage])

  useEffect(() => {
    setDraftHtml(null)
  }, [activeStage])

  useEffect(() => {
    const stage = place.workflow_stage ?? 'problem'
    if (!needsStageTemplate(place.stage_docs[stage])) return
    void updateNode(place.id, { stage_docs: { ...place.stage_docs, [stage]: emptyStageHtml(stage) } })
  }, [place.id, place.stage_docs, place.workflow_stage, updateNode])

  const storedHtml = ensureStageDoc(place.stage_docs[activeStage], activeStage)
  const livePlace =
    draftHtml !== null
      ? { ...place, stage_docs: { ...place.stage_docs, [activeStage]: draftHtml } }
      : place
  const editable = canEditStage(place, activeStage)
  const prompt = useMemo(() => buildCursorPromptForNode(place, nodes), [nodes, place])
  const addLabel = place.kind === 'project' ? 'Add module' : 'Add submodule'

  async function flushDoc() {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const pending = pendingHtmlRef.current
    if (pending == null) return
    pendingHtmlRef.current = null
    const current = placeRef.current
    const stage = stageRef.current
    await updateNode(current.id, { stage_docs: { ...current.stage_docs, [stage]: pending } })
  }

  useEffect(
    () => () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      const pending = pendingHtmlRef.current
      if (pending == null) return
      pendingHtmlRef.current = null
      const current = placeRef.current
      const stage = stageRef.current
      void updateNode(current.id, { stage_docs: { ...current.stage_docs, [stage]: pending } })
    },
    [place.id, activeStage, updateNode],
  )

  function handleDocChange(nextHtml: string) {
    if (!editable) return
    pendingHtmlRef.current = nextHtml
    setDraftHtml(nextHtml)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void flushDoc()
    }, 400)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      toast({ title: 'Copied Cursor prompt' })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-6 py-6" data-testid="module-dashboard">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Think</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900" data-testid="place-title">
            {place.title}
          </h1>
          {place.break_glass?.used && <p className="mt-1 text-xs font-medium text-amber-700">Emergency skip used</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" data-testid="place-details" onClick={() => openPanel(place.id)}>
            Details
          </Button>
          <Button type="button" variant="secondary" data-testid="add-module" onClick={onAddChild}>
            {addLabel}
          </Button>
          <Button type="button" variant="secondary" data-testid="copy-cursor-prompt" onClick={() => void copyPrompt()}>
            Copy Cursor prompt
          </Button>
          <Button type="button" variant="secondary" data-testid="import-session" onClick={() => setImportOpen(true)}>
            Import session MD
          </Button>
        </div>
      </div>

      <StageStrip node={place} activeStage={activeStage} onSelect={setActiveStage} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4">
          <StageChecklist node={livePlace} stage={activeStage} />
        </div>
        <StageDocument key={`${place.id}-${activeStage}`} html={storedHtml} editable={editable} onChange={handleDocChange} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {place.workflow_stage !== 'execute' && place.workflow_stage !== 'review' ? (
          <button
            type="button"
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
            onClick={() => setBreakOpen(true)}
          >
            Emergency: skip to Execute…
          </button>
        ) : (
          <span />
        )}
        <SignOffButton node={livePlace} onBeforeSignOff={flushDoc} />
      </div>

      <ImportSessionDialog nodeId={place.id} open={importOpen} onOpenChange={setImportOpen} />
      <BreakGlassDialog nodeId={place.id} open={breakOpen} onOpenChange={setBreakOpen} />
    </div>
  )
}
