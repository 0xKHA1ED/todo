'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { signIn, signUp, session, loading, configError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && session) router.replace('/map')
  }, [loading, router, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        toast({
          title: 'Account created',
          description: 'If email confirmations are enabled, confirm your email before signing in.',
        })
      }
      router.replace('/map')
    } catch (error) {
      toast({
        title: mode === 'signin' ? 'Sign in failed' : 'Sign up failed',
        description: error instanceof Error ? error.message : 'Please check your credentials and try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border bg-card/90 p-8 text-card-foreground shadow-2xl backdrop-blur">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Mindmap Tasks</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {mode === 'signin' ? 'Welcome back' : 'Create your workspace'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Email/password auth powered by Supabase, with your private task tree protected by RLS.
        </p>
      </div>

      {configError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <p className="font-medium">Supabase is not configured.</p>
          <p className="mt-1 text-muted-foreground">{configError}</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      )}

      <Button
        className="mt-4 w-full"
        variant="ghost"
        disabled={submitting || Boolean(configError)}
        onClick={() => setMode((current) => (current === 'signin' ? 'signup' : 'signin'))}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </Button>
    </section>
  )
}
