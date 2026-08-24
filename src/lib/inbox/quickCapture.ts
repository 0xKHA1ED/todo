export type QuickCaptureResult = {
  title: string
  tags: string[]
}

const QUICK_CAPTURE_TAG_REGEX = /^#([a-z0-9_-]+)$/i

export function parseQuickCaptureTitle(raw: string): QuickCaptureResult {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const trailingTags: string[] = []

  while (tokens.length > 0) {
    const match = tokens[tokens.length - 1]?.match(QUICK_CAPTURE_TAG_REGEX)
    if (!match) break
    trailingTags.unshift(match[1])
    tokens.pop()
  }

  const tags: string[] = []
  for (const tag of trailingTags) {
    if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      tags.push(tag)
    }
  }

  return {
    title: tokens.join(' ').trim() || 'New Task',
    tags,
  }
}