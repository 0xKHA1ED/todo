'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function EmailCodePage() {
  const router = useRouter()
  const { toast } = useToast()
  const requestEmailCode = useAuthStore((state) => state.requestEmailCode)
  const verifyEmailCode = useAuthStore((state) => state.verifyEmailCode)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [codeError, setCodeError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (Date.now() >= cooldownUntil) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [cooldownUntil])

  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const resendDisabled = Date.now() < cooldownUntil

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await requestEmailCode(email)
      setStep('code')
    } catch {
      toast({
        title: 'Could not send email',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) {
      setCodeError('Enter the code from your email.')
      return
    }
    setCodeError('')
    setSubmitting(true)
    try {
      await verifyEmailCode(email, trimmed)
      router.replace('/map')
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not verify code',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (Date.now() < cooldownUntil) return
    try {
      await requestEmailCode(email)
      setCooldownUntil(Date.now() + 60_000)
    } catch {
      toast({
        title: 'Could not send email',
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border bg-card/90 p-8">
        <h1 className="text-2xl font-semibold">Sign in with a code</h1>
        {step === 'email' ? (
          <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
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
              Email me a code
            </Button>
          </form>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              If that email has an account, we sent a code.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleCodeSubmit}>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={token}
                  onChange={(event) => {
                    setToken(event.target.value)
                    setCodeError('')
                  }}
                />
                {codeError ? <p className="text-sm text-destructive">{codeError}</p> : null}
              </div>
              <Button className="w-full" type="submit" disabled={submitting}>
                Sign in
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full"
              disabled={resendDisabled}
              onClick={handleResend}
            >
              {resendDisabled ? `Resend in ${remainingSeconds}s` : 'Resend'}
            </Button>
          </>
        )}
        <Link className="mt-4 inline-block text-sm text-primary" href="/login">
          Use password instead
        </Link>
      </div>
    </main>
  )
}
