'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Waypoints } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function HomePage() {
  const router = useRouter()
  const { session, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return
    router.replace(session ? '/map' : '/login')
  }, [loading, router, session])

  return (
    <main className="bg-aurora-soft flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-400 text-primary-foreground shadow-lg shadow-primary/30">
        <Waypoints className="h-6 w-6 animate-pulse" />
      </span>
      Opening your mindmap...
    </main>
  )
}
