'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          className={cn(
            'grid w-full max-w-sm grid-cols-[1fr_auto] items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg',
            toast.variant === 'destructive' && 'border-destructive',
          )}
          open
          onOpenChange={(open) => {
            if (!open) dismiss(toast.id)
          }}
        >
          <div className="space-y-1">
            {toast.title && <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>}
            {toast.description && (
              <ToastPrimitive.Description className="text-sm text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  )
}
