'use client'

import { checklistHeadingForLabel, checklistState } from '@/lib/life-pm/stageContent'
import type { NodeRecord, WorkflowStage } from '@/types'

interface StageChecklistProps {
  node: NodeRecord
  stage: WorkflowStage
}

export function StageChecklist({ node, stage }: StageChecklistProps) {
  const items = checklistState(node, stage)
  const locked = node.decisions.length
  const open = node.open_questions.length

  function scrollToHeading(label: string) {
    const heading = checklistHeadingForLabel(label)
    const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="stage-document"] h2'))
    const target = headings.find((element) => element.textContent?.trim().toLowerCase() === heading.toLowerCase())
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-full flex-col gap-4" data-testid="stage-checklist">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stage checklist</p>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-sm text-slate-700">
              <span aria-hidden>{item.checked ? '☑' : '☐'}</span>
              <button
                type="button"
                className={item.checked ? 'text-left text-slate-500 underline-offset-2 line-through hover:underline' : 'text-left underline-offset-2 hover:underline'}
                onClick={() => scrollToHeading(item.label)}
              >
                {item.label}
              </button>
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
