import type { NodeRecord } from '@/types'

export const INBOX_LIST_CAP = 8

export function getInboxId(nodes: NodeRecord[]): string | null {
  return nodes.find((node) => node.system_role === 'inbox')?.id ?? null
}

export function listInboxItems(nodes: NodeRecord[], inboxId: string) {
  const items = nodes
    .filter((node) => node.parent_id === inboxId && !node.completed)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.sort_order - b.sort_order)

  return {
    items: items.slice(0, INBOX_LIST_CAP),
    overflow: Math.max(0, items.length - INBOX_LIST_CAP),
  }
}