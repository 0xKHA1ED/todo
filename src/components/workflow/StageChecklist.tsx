'use client'

import { checklistState } from '@/lib/life-pm/stageContent'
import type { NodeRecord, WorkflowStage } from '@/types'

interface StageChecklistProps {
  node: NodeRecord
  stage: WorkflowStage
}

export function StageChecklist({ node, stage }: StageChecklistProps) {
  const items = checklistState(node, stage)
  const locked = node.decisions.length
  const open = node.open_questions.length

  return (
    <div className="flex h-full flex-col gap-4" data-testid="stage-checklist">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stage checklist</p>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-sm text-slate-700">
              <span aria-hidden>{item.checked ? '☑' : '☐'}</span>
              <span className={item.checked ? 'text-slate-500 line-through' : ''}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto space-y-1 text-xs text-slate-500">
        <p>Locked: {locked}</p>
        <p>Open: {open}</p>
      </div>
    </div>
  )
}
