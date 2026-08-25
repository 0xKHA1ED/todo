'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, loading, configError } = useAuthStore()

  useEffect(() => {
    if (!loading && !session && !configError) router.replace('/login')
  }, [configError, loading, router, session])

  if (loading) {
    return (
      <main className="bg-aurora-soft flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading session...
      </main>
    )
  }

  if (configError) {
    return (
      <main className="bg-aurora-soft flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 text-card-foreground shadow-[0_40px_120px_-50px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <h1 className="text-lg font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">{configError}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Copy <code>.env.example</code> to <code>.env.local</code>, set your Supabase URL and anon key, then restart the dev server.
          </p>
        </div>
      </main>
    )
  }

  if (!session) return null
  return <>{children}</>
}
