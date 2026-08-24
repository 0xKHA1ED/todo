import type { NodeRecord } from '@/types'
import { daysUntil, getSubtreeIds, isArea, type NowBucket } from '@/lib/place/placeModel'

export const LENS_ITEM_CAP = 20

export type ContextLens = {
  id: 'errands' | 'computer' | 'calls' | 'home'
  label: string
  tag: string
}

export type LensBucket = NowBucket | 'other'

export type RankedLensItem = {
  node: NodeRecord
  bucket: LensBucket
  daysUntil: number | null
}

export const CONTEXT_LENSES: ContextLens[] = [
  { id: 'errands', label: 'Errands', tag: 'errands' },
  { id: 'computer', label: 'At computer', tag: 'computer' },
  { id: 'calls', label: 'Calls', tag: 'calls' },
  { id: 'home', label: 'At home', tag: 'home' },
]

const bucketOrder: Record<LensBucket, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  high: 3,
  other: 4,
}

export function getLensById(id: string): ContextLens | undefined {
  return CONTEXT_LENSES.find((lens) => lens.id === id)
}

function matchesLensTag(node: NodeRecord, tag: string) {
  const needle = tag.toLowerCase()
  return node.tags.some((candidate) => candidate.toLowerCase() === needle)
}

function bucketFor(node: NodeRecord, today: Date): { bucket: LensBucket; daysUntil: number | null } {
  const delta = daysUntil(node.date, today)

  if (delta !== null && delta < 0) return { bucket: 'overdue', daysUntil: delta }
  if (delta === 0) return { bucket: 'today', daysUntil: 0 }
  if (delta !== null && delta <= 7) return { bucket: 'soon', daysUntil: delta }
  if (node.urgency === 'high' && node.date === null) return { bucket: 'high', daysUntil: null }

  return { bucket: 'other', daysUntil: delta }
}

function compareLensItems(a: RankedLensItem, b: RankedLensItem) {
  const bucketDelta = bucketOrder[a.bucket] - bucketOrder[b.bucket]
  if (bucketDelta !== 0) return bucketDelta

  if (a.bucket === 'overdue' || a.bucket === 'today' || a.bucket === 'soon') {
    const dayDelta = (a.daysUntil ?? Number.MAX_SAFE_INTEGER) - (b.daysUntil ?? Number.MAX_SAFE_INTEGER)
    if (dayDelta !== 0) return dayDelta
  }

  return a.node.sort_order - b.node.sort_order || a.node.created_at.localeCompare(b.node.created_at)
}

export function rankLensItems(nodes: NodeRecord[], rootId: string, lensId: string, today: Date) {
  const lens = getLensById(lensId)
  if (!lens) {
    return { items: [] as RankedLensItem[], overflow: 0 }
  }

  const subtreeIds = getSubtreeIds(nodes, rootId)
  const ranked = nodes
    .filter((node) => node.id !== rootId)
    .filter((node) => subtreeIds.has(node.id))
    .filter((node) => !node.completed)
    .filter((node) => !isArea(nodes, node.id))
    .filter((node) => matchesLensTag(node, lens.tag))
    .map<RankedLensItem>((node) => {
      const ranking = bucketFor(node, today)
      return { node, bucket: ranking.bucket, daysUntil: ranking.daysUntil }
    })

  ranked.sort(compareLensItems)

  return {
    items: ranked.slice(0, LENS_ITEM_CAP),
    overflow: Math.max(0, ranked.length - LENS_ITEM_CAP),
  }
}