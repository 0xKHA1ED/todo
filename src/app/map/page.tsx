'use client'

import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { PlaceScreen } from '@/components/place/PlaceScreen'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNodeStore } from '@/lib/store/useNodeStore'

function MapContent() {
  const user = useAuthStore((state) => state.user)
  const fetchAllNodes = useNodeStore((state) => state.fetchAllNodes)

  useEffect(() => {
    if (!user) return
    fetchAllNodes().catch(() => undefined)
  }, [fetchAllNodes, user])

  return (
    <ReactFlowProvider>
      <PlaceScreen />
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
