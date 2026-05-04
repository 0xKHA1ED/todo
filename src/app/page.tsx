'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function HomePage() {
  const router = useRouter()
  const { session, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return
    router.replace(session ? '/map' : '/login')
  }, [loading, router, session])

  return (
    <main className="flex min-h-screen items-center justify-center text-muted-foreground">
      Opening your mindmap...
    </main>
  )
}
