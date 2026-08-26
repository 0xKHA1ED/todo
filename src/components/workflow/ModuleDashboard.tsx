'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BreakGlassDialog } from '@/components/workflow/BreakGlassDialog'
import { ImportSessionDialog } from '@/components/workflow/ImportSessionDialog'
import { SignOffButton } from '@/components/workflow/SignOffButton'
import { StageChecklist } from '@/components/workflow/StageChecklist'
import { StageDocument } from '@/components/workflow/StageDocument'
import { StageStrip } from '@/components/workflow/StageStrip'
import { Button } from '@/components/ui/button'
import { buildCursorPromptForNode } from '@/lib/life-pm/promptFromNode'
import { canEditStage } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeRecord, WorkflowStage } from '@/types'

interface ModuleDashboardProps {
  place: NodeRecord
}

export function ModuleDashboard({ place }: ModuleDashboardProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const updateNode = useNodeStore((state) => state.updateNode)
  const [activeStage, setActiveStage] = useState<WorkflowStage>(place.workflow_stage ?? 'problem')
  const [importOpen, setImportOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setActiveStage(place.workflow_stage ?? 'problem')
  }, [place.id, place.workflow_stage])

  const html = place.stage_docs[activeStage] ?? ''
  const editable = canEditStage(place, activeStage)
  const prompt = useMemo(() => buildCursorPromptForNode(place, nodes), [nodes, place])

  function handleDocChange(nextHtml: string) {
    if (!editable) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void updateNode(place.id, { stage_docs: { ...place.stage_docs, [activeStage]: nextHtml } })
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{place.title}</h1>
          {place.break_glass?.used && <p className="mt-1 text-xs font-medium text-amber-700">Emergency skip used</p>}
        </div>
        <div className="flex flex-wrap gap-2">
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
          <StageChecklist node={place} stage={activeStage} />
        </div>
        <StageDocument key={`${place.id}-${activeStage}`} html={html} editable={editable} onChange={handleDocChange} />
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
        <SignOffButton node={place} />
      </div>

      <ImportSessionDialog nodeId={place.id} open={importOpen} onOpenChange={setImportOpen} />
      <BreakGlassDialog nodeId={place.id} open={breakOpen} onOpenChange={setBreakOpen} />
    </div>
  )
}
