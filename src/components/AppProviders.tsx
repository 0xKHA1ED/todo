'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return children
}
