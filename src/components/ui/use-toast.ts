'use client'

import * as React from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

type Listener = (toasts: Toast[]) => void
let toasts: Toast[] = []
const listeners: Listener[] = []

function emit() {
  listeners.forEach((listener) => listener(toasts))
}

export function toast(toastInput: Omit<Toast, 'id'>) {
  const id = crypto.randomUUID()
  toasts = [{ ...toastInput, id }, ...toasts].slice(0, 3)
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((toastItem) => toastItem.id !== id)
    emit()
  }, 5000)
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index >= 0) listeners.splice(index, 1)
    }
  }, [])

  return {
    toasts: state,
    toast,
    dismiss: (id: string) => {
      toasts = toasts.filter((toastItem) => toastItem.id !== id)
      emit()
    },
  }
}
