'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function AuthCallbackPage() {
  const router = useRouter()
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (session) {
      router.replace('/map')
      return
    }
    if (loading) return
    const timeout = window.setTimeout(() => {
      if (!useAuthStore.getState().session) setExpired(true)
    }, 1500)
    return () => window.clearTimeout(timeout)
  }, [loading, router, session])

  if (expired) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border bg-card/90 p-8">
          <h1 className="text-2xl font-semibold">Sign-in link invalid or expired</h1>
          <Link className="mt-4 inline-block text-sm text-primary" href="/login">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center text-muted-foreground">
      Signing you in…
    </main>
  )
}
