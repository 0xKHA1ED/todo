import type { NodeDensity, NodeRecord } from '@/types'

export function getDirectChildren(nodes: NodeRecord[], placeId: string): NodeRecord[] {
  return nodes.filter((node) => node.parent_id === placeId)
}

export function getSubtreeIds(nodes: NodeRecord[], placeId: string): Set<string> {
  const childrenByParent = new Map<string | null, NodeRecord[]>()
  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parent_id) ?? []
    siblings.push(node)
    childrenByParent.set(node.parent_id, siblings)
  }

  const ids = new Set<string>([placeId])
  const queue = [placeId]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    for (const child of childrenByParent.get(currentId) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id)
        queue.push(child.id)
      }
    }
  }
  return ids
}

export function subtreeDescendants(nodes: NodeRecord[], placeId: string): NodeRecord[] {
  const ids = getSubtreeIds(nodes, placeId)
  return nodes.filter((node) => node.id !== placeId && ids.has(node.id))
}

export function visitTargetIds(nodes: NodeRecord[], placeId: string): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (!byId.has(placeId)) return []

  const ids: string[] = []
  const visited = new Set<string>()
  let currentId: string | null = placeId

  while (currentId && !visited.has(currentId)) {
    const node = byId.get(currentId)
    if (!node) break
    visited.add(currentId)
    ids.push(currentId)
    currentId = node.parent_id
  }

  return ids
}

export function daysUntil(date: string | null, today: Date): number | null {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  const local = new Date(year, month - 1, day)
  const todayLocal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dateLocal = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate())
  return Math.round((dateLocal - todayLocal) / 86_400_000)
}

export type NowBucket = 'overdue' | 'today' | 'soon' | 'high'

export type RankedNowItem = {
  node: NodeRecord
  bucket: NowBucket
  daysUntil: number | null
}

function urgencyRank(node: NodeRecord): number {
  if (node.urgency === 'high') return 2
  if (node.urgency === 'normal') return 1
  return 0
}

function compareRankedNow(a: RankedNowItem, b: RankedNowItem): number {
  const dayDelta = (a.daysUntil ?? Number.MAX_SAFE_INTEGER) - (b.daysUntil ?? Number.MAX_SAFE_INTEGER)
  if (dayDelta !== 0) return dayDelta

  const urgencyDelta = urgencyRank(b.node) - urgencyRank(a.node)
  if (urgencyDelta !== 0) return urgencyDelta

  const visitedDelta = visitedAtMs(a.node) - visitedAtMs(b.node)
  if (visitedDelta !== 0) return visitedDelta

  return a.node.sort_order - b.node.sort_order || a.node.created_at.localeCompare(b.node.created_at)
}

export function rankNow(
  nodes: NodeRecord[],
  placeId: string,
  today: Date,
): { items: RankedNowItem[]; overflow: number } {
  const overdue: RankedNowItem[] = []
  const dueToday: RankedNowItem[] = []
  const nextSeven: RankedNowItem[] = []
  const highUndated: RankedNowItem[] = []

  for (const node of subtreeDescendants(nodes, placeId)) {
    if (node.completed) continue
    const until = daysUntil(node.date, today)
    if (until !== null && until < 0) overdue.push({ node, bucket: 'overdue', daysUntil: until })
    else if (until === 0) dueToday.push({ node, bucket: 'today', daysUntil: until })
    else if (until !== null && until <= 7) nextSeven.push({ node, bucket: 'soon', daysUntil: until })
    else if (node.urgency === 'high' && node.date === null) {
      highUndated.push({ node, bucket: 'high', daysUntil: null })
    }
  }

  overdue.sort(compareRankedNow)
  dueToday.sort(compareRankedNow)
  nextSeven.sort(compareRankedNow)
  highUndated.sort(compareRankedNow)

  const ranked = [...overdue, ...dueToday, ...nextSeven, ...highUndated]
  return {
    items: ranked.slice(0, 5),
    overflow: Math.max(0, ranked.length - 5),
  }
}

export const STALE_MS = 14 * 24 * 60 * 60 * 1000

export function isArea(nodes: NodeRecord[], nodeId: string): boolean {
  const current = nodes.find((node) => node.id === nodeId)
  return current?.system_role === 'inbox' || nodes.some((node) => node.parent_id === nodeId)
}

export function isStale(node: NodeRecord, now: Date): boolean {
  if (node.last_visited_at === null) return true
  return now.getTime() - Date.parse(node.last_visited_at) > STALE_MS
}

function visitedAtMs(node: NodeRecord): number {
  return node.last_visited_at === null ? 0 : Date.parse(node.last_visited_at)
}

function oldest(nodes: NodeRecord[]): NodeRecord | null {
  if (nodes.length === 0) return null
  return [...nodes].sort((a, b) => visitedAtMs(a) - visitedAtMs(b))[0] ?? null
}

export function pickForgotten(
  nodes: NodeRecord[],
  placeId: string,
  _now: Date,
  _nowItemIds: Set<string>,
): NodeRecord | null {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const parentsWithChildren = new Set(
    nodes.map((node) => node.parent_id).filter((parentId): parentId is string => parentId !== null),
  )
  const leaves = subtreeDescendants(nodes, placeId).filter((node) => {
    if (node.completed || parentsWithChildren.has(node.id)) return false

    let currentParentId = node.parent_id
    while (currentParentId && currentParentId !== placeId) {
      const parent = nodesById.get(currentParentId)
      if (!parent) break
      if (parent.completed) return false
      currentParentId = parent.parent_id
    }

    return true
  })
  if (leaves.length === 0) return null

  return (
    [...leaves].sort((a, b) => {
      const visitedDelta = visitedAtMs(a) - visitedAtMs(b)
      if (visitedDelta !== 0) return visitedDelta

      return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    })[0] ?? null
  )
}

export type PlaceChildView = {
  node: NodeRecord
  density: NodeDensity
  isArea: boolean
  insideCount: number
  dueCount: number
  attentionCount: number
  staleDays: number | null
}

function leafDensity(node: NodeRecord, today: Date): NodeDensity {
  const until = daysUntil(node.date, today)
  if (until !== null && until <= 0) return 'loud'
  if ((until !== null && until <= 7) || node.urgency === 'high') return 'medium'
  return 'compact'
}

function louder(a: NodeDensity, b: NodeDensity): NodeDensity {
  if (a === 'loud' || b === 'loud') return 'loud'
  if (a === 'medium' || b === 'medium') return 'medium'
  return a === 'area' || b === 'area' ? 'area' : 'compact'
}

function areaDensity(descendants: NodeRecord[], today: Date): NodeDensity {
  const open = descendants.filter((node) => !node.completed)
  let density: NodeDensity = 'area'
  for (const node of open) {
    density = louder(density, leafDensity(node, today))
  }
  return density
}

function childStaleDays(node: NodeRecord, now: Date): number | null {
  if (!isStale(node, now)) return null
  if (node.last_visited_at === null) return -1
  return Math.floor((now.getTime() - Date.parse(node.last_visited_at)) / 86_400_000)
}

function isAttentionNode(node: NodeRecord, today: Date): boolean {
  if (node.completed) return false
  const until = daysUntil(node.date, today)
  return (until !== null && until <= 7) || node.urgency === 'high'
}

function childDueCount(node: NodeRecord, descendants: NodeRecord[], today: Date): number {
  return [node, ...descendants].filter((candidate) => {
    if (candidate.completed) return false
    const until = daysUntil(candidate.date, today)
    return until !== null && until <= 7
  }).length
}

function childAttentionCount(node: NodeRecord, descendants: NodeRecord[], today: Date): number {
  return [node, ...descendants].filter((candidate) => isAttentionNode(candidate, today)).length
}

export function visibleChildren(
  nodes: NodeRecord[],
  placeId: string,
  showDone: boolean,
  today: Date,
  now: Date,
): PlaceChildView[] {
  const views: PlaceChildView[] = []

  for (const child of getDirectChildren(nodes, placeId)) {
    const descendants = subtreeDescendants(nodes, child.id)
    const area = isArea(nodes, child.id)

    if (!showDone) {
      if (child.completed) continue
      if (area && descendants.length > 0 && descendants.every((node) => node.completed)) continue
    }

    let density: NodeDensity
    if (child.completed) {
      density = 'compact'
    } else if (area) {
      density = louder(leafDensity(child, today), areaDensity(descendants, today))
    } else {
      density = leafDensity(child, today)
    }

    views.push({
      node: child,
      density,
      isArea: area,
      insideCount: descendants.length,
      dueCount: childDueCount(child, descendants, today),
      attentionCount: childAttentionCount(child, descendants, today),
      staleDays: childStaleDays(child, now),
    })
  }

  return views
}
