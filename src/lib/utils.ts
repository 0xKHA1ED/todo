import { type ClassValue, clsx } from 'clsx'
import { format, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}

export function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )
}

export function getPlainTextFromTipTap(content: string | null | undefined) {
  if (!content) return ''
  try {
    const doc = JSON.parse(content) as { content?: unknown[] }
    return extractTipTapText(doc)
  } catch {
    return content
  }
}

function extractTipTapText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const current = node as { text?: unknown; content?: unknown[] }
  const ownText = typeof current.text === 'string' ? current.text : ''
  const childText = Array.isArray(current.content) ? current.content.map(extractTipTapText).join(' ') : ''
  return `${ownText} ${childText}`.trim()
}

export function defaultEditorContent() {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  })
}
