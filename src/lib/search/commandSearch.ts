import { getPlainTextFromTipTap } from '@/lib/utils'
import type { CommandSearchResult, NodeRecord } from '@/types'

export const COMMAND_SEARCH_LIMIT = 30
export const COMMAND_PREVIEW_LENGTH = 120

export function searchCommandNodes(nodes: NodeRecord[], query: string): CommandSearchResult[] {
  const normalized = query.trim().toLowerCase()

  const results: CommandSearchResult[] = []
  for (const node of nodes) {
    if (node.parent_id === null) continue

    const preview = getPlainTextFromTipTap(node.description).slice(0, COMMAND_PREVIEW_LENGTH)

    if (normalized) {
      const matches =
        node.title.toLowerCase().includes(normalized) ||
        preview.toLowerCase().includes(normalized) ||
        node.tags.some((tag) => tag.toLowerCase().includes(normalized))
      if (!matches) continue
    }

    results.push({
      id: node.id,
      title: node.title,
      descriptionPreview: preview,
      tags: node.tags,
    })

    if (results.length >= COMMAND_SEARCH_LIMIT) break
  }

  return results
}
