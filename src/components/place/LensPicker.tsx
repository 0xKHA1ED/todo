'use client'

import { Button } from '@/components/ui/button'
import { CONTEXT_LENSES } from '@/lib/place/contextLenses'

interface LensPickerProps {
  activeLensId: string | null
  onToggle: (lensId: string | null) => void
}

export function LensPicker({ activeLensId, onToggle }: LensPickerProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[1.2rem] border border-white/75 bg-white/78 p-2 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.8)] backdrop-blur-xl">
      {CONTEXT_LENSES.map((lens) => {
        const active = lens.id === activeLensId

        return (
          <Button
            key={lens.id}
            type="button"
            size="sm"
            variant={active ? 'default' : 'secondary'}
            aria-pressed={active}
            className="rounded-full"
            onClick={() => onToggle(active ? null : lens.id)}
          >
            {lens.label}
          </Button>
        )
      })}
    </div>
  )
}