import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Life PM',
  description: 'Portfolio-first project stewardship with an enforced think-then-do workflow.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
