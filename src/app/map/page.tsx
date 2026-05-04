'use client'

import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { MindmapCanvas } from '@/components/canvas/MindmapCanvas'
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar'
import { FilterBar } from '@/components/filters/FilterBar'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { SlideOutPanel } from '@/components/panel/SlideOutPanel'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNodeStore } from '@/lib/store/useNodeStore'

function MapContent() {
  const user = useAuthStore((state) => state.user)
  const fetchAllNodes = useNodeStore((state) => state.fetchAllNodes)
  const loading = useNodeStore((state) => state.loading)
  const error = useNodeStore((state) => state.error)
  useKeyboardNav()

  useEffect(() => {
    if (!user) return
    fetchAllNodes().catch(() => undefined)
  }, [fetchAllNodes, user])

  return (
    <ReactFlowProvider>
      <div className="relative h-screen w-screen overflow-hidden">
        <MindmapCanvas />
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap gap-3">
          <div className="pointer-events-auto">
            <FilterBar />
          </div>
          <div className="pointer-events-auto">
            <CanvasToolbar loading={loading} error={error} />
          </div>
        </div>
        <SlideOutPanel />
        <CommandPalette />
      </div>
    </ReactFlowProvider>
  )
}

export default function MapPage() {
  return (
    <AuthGuard>
      <MapContent />
    </AuthGuard>
  )
}
