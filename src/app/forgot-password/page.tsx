'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      toast({
        title: 'Could not send email',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border bg-card/90 p-8">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={submitting}>
            Send reset link
          </Button>
        </form>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">
            If that email has an account, we sent a reset link.
          </p>
        ) : null}
        <Link className="mt-4 inline-block text-sm text-primary" href="/login">
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
