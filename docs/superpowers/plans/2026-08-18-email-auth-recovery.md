# Email Auth Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reset a forgotten password by email, and sign in with an email one-time code or magic link, without changing password signup.

**Architecture:** Thin helpers build redirect URLs that include `NEXT_PUBLIC_BASE_PATH` and a trailing slash (static export). Zustand auth store gains `requestPasswordReset`, `updatePassword`, `requestEmailCode`, and `verifyEmailCode`. Dedicated static routes keep Supabase redirect URLs stable. Send endpoints always show generic success copy so emails cannot be enumerated.

**Tech Stack:** Next.js 15 static export, Supabase Auth (`resetPasswordForEmail`, `updateUser`, `signInWithOtp`, `verifyOtp`), existing Zustand auth store, Playwright (UI states only; no inbox assertions).

**Spec:** `docs/superpowers/specs/2026-08-18-place-based-life-map-design.md` Part 2.

**Depends on:** Part 1 may already be on `master`. This plan only touches auth routes, the auth store, login links, README, and auth tests. Do not revert Place UI.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/auth/redirectUrl.ts` | Origin + base path + trailing slash |
| `src/lib/auth/redirectUrl.test.ts` | Unit tests for that helper |
| `src/lib/store/useAuthStore.ts` | Reset / OTP methods |
| `src/app/login/page.tsx` + `LoginForm.tsx` | Links to forgot + code |
| `src/app/forgot-password/page.tsx` | Request reset mail |
| `src/app/reset-password/page.tsx` | Set new password after recovery |
| `src/app/login/code/page.tsx` | Request + enter OTP |
| `src/app/auth/callback/page.tsx` | Consume magic-link tokens → `/map` |
| `tests/e2e/auth-recovery.spec.ts` | Generic copy, expired reset, code field |
| `README.md` | Redirect URLs, enable email OTP |

---

### Task 1: Redirect URL helper (TDD)

**Files:**
- Create: `src/lib/auth/redirectUrl.ts`
- Test: `src/lib/auth/redirectUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { getAuthRedirectUrl } from './redirectUrl'

describe('getAuthRedirectUrl', () => {
  it('joins origin, base path, and a trailing-slash path', () => {
    expect(getAuthRedirectUrl('/reset-password', 'http://localhost:3000', '')).toBe(
      'http://localhost:3000/reset-password/',
    )
    expect(getAuthRedirectUrl('/auth/callback', 'https://example.github.io', '/todo')).toBe(
      'https://example.github.io/todo/auth/callback/',
    )
  })

  it('tolerates a base path with or without slashes', () => {
    expect(getAuthRedirectUrl('auth/callback', 'https://x.github.io', 'todo')).toBe(
      'https://x.github.io/todo/auth/callback/',
    )
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/auth/redirectUrl.test.ts`

Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
export function getAuthRedirectUrl(path: string, origin: string, basePath: string): string {
  const prefix = `/${basePath.replace(/^\/|\/$/g, '')}`.replace(/^\/$/, '')
  const trimmed = path.replace(/^\/|\/$/g, '')
  return `${origin.replace(/\/$/, '')}${prefix}/${trimmed}/`
}
```

Browser wrapper:

```ts
export function getClientAuthRedirectUrl(path: string): string {
  const origin = window.location.origin
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  return getAuthRedirectUrl(path, origin, basePath)
}
```

- [ ] **Step 4: Run tests**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/redirectUrl.ts src/lib/auth/redirectUrl.test.ts
git commit -m "feat: build Supabase auth redirect URLs with base path"
```

---

### Task 2: Auth store methods

**Files:**
- Modify: `src/lib/store/useAuthStore.ts`

- [ ] **Step 1: Extend the store interface**

```ts
requestPasswordReset: (email: string) => Promise<void>
updatePassword: (password: string) => Promise<void>
requestEmailCode: (email: string) => Promise<void>
verifyEmailCode: (email: string, token: string) => Promise<void>
```

Implementations. `updatePassword` and `verifyEmailCode` throw on any Supabase error. `requestPasswordReset` and `requestEmailCode` throw only for rate limits (status 429) and client config failures so unknown emails cannot be enumerated:

```ts
function isConfigOrRateLimit(error: { status?: number; message: string }) {
  return error.status === 429 || error.message.toLowerCase().includes('not configured')
}

async requestPasswordReset(email) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getClientAuthRedirectUrl('/reset-password'),
  })
  if (error && isConfigOrRateLimit(error)) throw error
},

async updatePassword(password) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
},

async requestEmailCode(email) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: getClientAuthRedirectUrl('/auth/callback'),
    },
  })
  if (error && isConfigOrRateLimit(error)) throw error
},

async verifyEmailCode(email, token) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
},
```

Import `getClientAuthRedirectUrl` from `@/lib/auth/redirectUrl`.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/store/useAuthStore.ts
git commit -m "feat: add password reset and email OTP to the auth store"
```

---

### Task 3: Forgot-password request page + login link

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Modify: `src/components/auth/LoginForm.tsx`

- [ ] **Step 1: Page**

Client page, same card chrome as login (`max-w-md rounded-2xl border bg-card/90 p-8`).

- Title: `Forgot password`
- Email input `id="email"` required
- Submit button `Send reset link`
- On success (no throw): paragraph **If that email has an account, we sent a reset link.**
- On throw: toast title `Could not send email` (network/config only)
- Link `Back to sign in` → `/login`

Do not branch copy on error messages like “User not found”. If Supabase returns an error that would leak existence, still show the generic success paragraph **unless** it is a config/network failure (`getSupabaseConfigError()` or `fetch`/client not configured). For `error.status === 429`, toast “Could not send email”. For other API errors, still show generic success (Supabase may error on invalid email format — then show the thrown message via toast and do not claim success). **Rule:** success copy only when `requestPasswordReset` resolves.

- [ ] **Step 2: LoginForm (sign-in mode only)**

Under the submit button, ghost/link button:

```tsx
<Button type="button" variant="ghost" className="mt-2 w-full" asChild>
  <Link href="/forgot-password">Forgot password?</Link>
</Button>
<Button type="button" variant="ghost" className="w-full" asChild>
  <Link href="/login/code">Email me a code instead</Link>
</Button>
```

Use `next/link`. Hide both in signup mode.

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/forgot-password/page.tsx src/components/auth/LoginForm.tsx
git commit -m "feat: add forgot-password request page"
```

---

### Task 4: Reset-password page

**Files:**
- Create: `src/app/reset-password/page.tsx`

- [ ] **Step 1: Implement**

Client page. `initializeAuth` already runs in `AppProviders`.

State: `status: 'waiting' | 'ready' | 'expired'`

```ts
useEffect(() => {
  const timeout = window.setTimeout(() => {
    const session = useAuthStore.getState().session
    setStatus(session ? 'ready' : 'expired')
  }, 800)
  const unsub = useAuthStore.subscribe((state, prev) => {
    if (!prev.session && state.session) setStatus('ready')
  })
  return () => {
    window.clearTimeout(timeout)
    unsub()
  }
}, [])
```

Zustand’s `subscribe` in v4 is `useAuthStore.subscribe(listener)`. Use:

```ts
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
```

`waiting`: “Checking reset link…”

`expired`: “This reset link is invalid or expired.” + `Link` to `/forgot-password`.

`ready`: two password fields (`New password`, `Confirm password`), minLength 6, submit disabled unless they match. `updatePassword(newPassword)` then `router.replace('/map')`. Mismatch: inline “Passwords do not match.” Failures: toast with error message.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/reset-password/page.tsx
git commit -m "feat: add reset-password page for recovery sessions"
```

---

### Task 5: Email code page

**Files:**
- Create: `src/app/login/code/page.tsx`

- [ ] **Step 1: Implement two-step UI**

Step `email`:

- Email field
- Button `Email me a code`
- On resolve: generic **If that email has an account, we sent a code.** and set step to `code`, stash email in state
- On reject: toast `Could not send email`

Step `code`:

- Text: same generic success line remains visible
- Input `id="code"` `inputMode="numeric"` `autoComplete="one-time-code"` `maxLength={8}` (paste-friendly, not strictly 6)
- Button `Sign in`
- Empty submit: do not call network; set field error `Enter the code from your email.`
- `verifyEmailCode(email, token.trim())` then `router.replace('/map')`
- Verify errors: toast with `error.message` (wrong code), never “no account”
- `Resend` button: disabled while `Date.now() < cooldownUntil`. On click, `requestEmailCode(email)` then `setCooldownUntil(Date.now() + 60_000)`. Show remaining seconds.

Link `Use password instead` → `/login`.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/login/code/page.tsx
git commit -m "feat: add email one-time code sign-in"
```

---

### Task 6: Magic-link callback page

**Files:**
- Create: `src/app/auth/callback/page.tsx`

- [ ] **Step 1: Implement**

Client page. `detectSessionInUrl` is already true on the Supabase client.

```tsx
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
```

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/page.tsx
git commit -m "feat: complete magic-link sign-in on /auth/callback"
```

---

### Task 7: Playwright auth recovery

**Files:**
- Create: `tests/e2e/auth-recovery.spec.ts`
- Modify: `tests/e2e/auth.spec.ts` only if login page assertions still look for the old subtitle-only screen.

- [ ] **Step 1: Write tests**

```ts
import { expect, test } from '@playwright/test'
import { hasSupabaseEnv } from './helpers'

test('login offers forgot password and email code links', async ({ page }) => {
  await page.goto('/login/')
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Email me a code instead' })).toBeVisible()
})

test('forgot-password form shows generic success copy', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/forgot-password/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('If that email has an account, we sent a reset link.')).toBeVisible()
})

test('reset-password without a session shows expired state', async ({ page }) => {
  await page.goto('/reset-password/')
  await expect(page.getByText('This reset link is invalid or expired')).toBeVisible()
  await expect(page.getByRole('link', { name: /forgot-password|request another/i })).toBeVisible()
})

test('email-code form shows the code field after submit', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/login/code/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByText('If that email has an account, we sent a code.')).toBeVisible()
  await expect(page.getByLabel('Code')).toBeVisible()
})

test('code field rejects empty submit', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/login/code/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByLabel('Code')).toBeVisible()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Enter the code from your email.')).toBeVisible()
})
```

Label the OTP input with `<Label htmlFor="code">Code</Label>` in Task 5 so `getByLabel('Code')` works.

On the expired reset page, link to `/forgot-password` with accessible name `Request another reset link`.

Send-mail methods already swallow unknown-user errors (Task 2). `verifyEmailCode` still throws on a bad code.

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- tests/e2e/auth-recovery.spec.ts tests/e2e/auth.spec.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth-recovery.spec.ts src/lib/store/useAuthStore.ts src/app/login/code/page.tsx src/app/forgot-password/page.tsx src/app/reset-password/page.tsx
git commit -m "test: cover forgot-password and email-code UI without inbox access"
```

---

### Task 8: README operator steps

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add “Auth URLs and email login” under Supabase Setup**

Document:

1. Authentication → URL Configuration: Site URL `http://localhost:3000` locally and `https://<org>.github.io/todo` in production.
2. Redirect URLs include:
   - `http://localhost:3000/reset-password/**`
   - `http://localhost:3000/auth/callback/**`
   - `https://<org>.github.io/todo/reset-password/**`
   - `https://<org>.github.io/todo/auth/callback/**`
3. Enable Email OTP (Authentication → Providers → Email).
4. Recovery and magic-link templates may include both the token (`{{ .Token }}`) and `{{ .ConfirmationURL }}`.
5. Users can sign in with password, **Forgot password?**, or **Email me a code instead**. Signup remains email + password.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document password reset, email OTP, and redirect URLs"
```
