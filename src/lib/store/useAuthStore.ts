'use client'

import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getClientAuthRedirectUrl } from '@/lib/auth/redirectUrl'
import { getSupabaseClient, getSupabaseConfigError } from '@/lib/supabase/client'

function isConfigOrRateLimit(error: { status?: number; message: string }) {
  return error.status === 429 || error.message.toLowerCase().includes('not configured')
}

interface AuthStore {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
  configError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  requestEmailCode: (email: string) => Promise<void>
  verifyEmailCode: (email: string, token: string) => Promise<void>
  initializeAuth: () => void
}

let unsubscribeAuth: (() => void) | null = null

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,
  configError: null,

  async signIn(email, password) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signUp(email, password) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },

  async signOut() {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

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

  initializeAuth() {
    if (get().initialized) return

    const configError = getSupabaseConfigError()
    if (configError) {
      set({ configError, loading: false, initialized: true })
      return
    }

    const supabase = getSupabaseClient()
    set({ initialized: true, loading: true, configError: null })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error
        set({
          session: data.session,
          user: data.session?.user ?? null,
          loading: false,
        })
      })
      .catch((error: Error) => {
        set({ configError: error.message, loading: false })
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    unsubscribeAuth = () => data.subscription.unsubscribe()
  },
}))

export function disposeAuthListener() {
  unsubscribeAuth?.()
  unsubscribeAuth = null
}
