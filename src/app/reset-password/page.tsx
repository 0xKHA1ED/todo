'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const [status, setStatus] = useState<'waiting' | 'ready' | 'expired'>('waiting')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (useAuthStore.getState().session) {
      setStatus('ready')
      return
    }
    const unsub = useAuthStore.subscribe((state) => {
      if (state.session) setStatus('ready')
    })
    const timeout = window.setTimeout(() => {
      if (!useAuthStore.getState().session) setStatus('expired')
    }, 1200)
    return () => {
      unsub()
      window.clearTimeout(timeout)
    }
  }, [])

  const passwordsMatch = newPassword === confirmPassword
  const canSubmit = passwordsMatch && newPassword.length >= 6

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordsMatch) return
    setSubmitting(true)
    try {
      await updatePassword(newPassword)
      router.replace('/map')
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not update password',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border bg-card/90 p-8">
        {status === 'waiting' ? <p>Checking reset link…</p> : null}
        {status === 'expired' ? (
          <>
            <h1 className="text-2xl font-semibold">This reset link is invalid or expired.</h1>
            <Link className="mt-4 inline-block text-sm text-primary" href="/forgot-password">
              Request another reset link
            </Link>
          </>
        ) : null}
        {status === 'ready' ? (
          <>
            <h1 className="text-2xl font-semibold">Set a new password</h1>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {!passwordsMatch ? <p className="text-sm text-destructive">Passwords do not match.</p> : null}
              <Button className="w-full" type="submit" disabled={!canSubmit || submitting}>
                Update password
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </main>
  )
}
