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

export function daysUntil(date: string | null, today: Date): number | null {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  const local = new Date(year, month - 1, day)
  const todayLocal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dateLocal = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate())
  return Math.round((dateLocal - todayLocal) / 86_400_000)
}

function compareDate(a: NodeRecord, b: NodeRecord): number {
  return (a.date ?? '').localeCompare(b.date ?? '')
}

export function rankNow(
  nodes: NodeRecord[],
  placeId: string,
  today: Date,
): { items: NodeRecord[]; overflow: number } {
  const overdue: NodeRecord[] = []
  const dueToday: NodeRecord[] = []
  const nextSeven: NodeRecord[] = []
  const highUndated: NodeRecord[] = []

  for (const node of subtreeDescendants(nodes, placeId)) {
    if (node.completed) continue
    const until = daysUntil(node.date, today)
    if (until !== null && until < 0) overdue.push(node)
    else if (until === 0) dueToday.push(node)
    else if (until !== null && until <= 7) nextSeven.push(node)
    else if (node.urgency === 'high' && node.date === null) highUndated.push(node)
  }

  overdue.sort(compareDate)
  nextSeven.sort(compareDate)
  highUndated.sort((a, b) => a.sort_order - b.sort_order)

  const ranked = [...overdue, ...dueToday, ...nextSeven, ...highUndated]
  return {
    items: ranked.slice(0, 5),
    overflow: Math.max(0, ranked.length - 5),
  }
}

export const STALE_MS = 14 * 24 * 60 * 60 * 1000

export function isArea(nodes: NodeRecord[], nodeId: string): boolean {
  return nodes.some((node) => node.parent_id === nodeId)
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
  now: Date,
  nowItemIds: Set<string>,
): NodeRecord | null {
  const children = getDirectChildren(nodes, placeId).filter((node) => !node.completed)
  const staleAreas = children.filter((node) => isArea(nodes, node.id) && isStale(node, now))
  const staleArea = oldest(staleAreas)
  if (staleArea) return staleArea

  const staleLeaves = children.filter(
    (node) => !isArea(nodes, node.id) && isStale(node, now) && !nowItemIds.has(node.id),
  )
  return oldest(staleLeaves)
}

export type PlaceChildView = {
  node: NodeRecord
  density: NodeDensity
  insideCount: number
  dueCount: number
  staleDays: number | null
}

function leafDensity(node: NodeRecord, today: Date): NodeDensity {
  const until = daysUntil(node.date, today)
  if (until !== null && until <= 0) return 'loud'
  if ((until !== null && until <= 7) || node.urgency === 'high') return 'medium'
  return 'compact'
}

function areaDensity(descendants: NodeRecord[], today: Date): NodeDensity {
  const open = descendants.filter((node) => !node.completed)
  if (open.some((node) => {
    const until = daysUntil(node.date, today)
    return until !== null && until <= 0
  })) {
    return 'loud'
  }
  if (open.some((node) => {
    const until = daysUntil(node.date, today)
    return (until !== null && until <= 7) || node.urgency === 'high'
  })) {
    return 'medium'
  }
  return 'area'
}

function childStaleDays(node: NodeRecord, now: Date): number | null {
  if (!isStale(node, now)) return null
  if (node.last_visited_at === null) return -1
  return Math.floor((now.getTime() - Date.parse(node.last_visited_at)) / 86_400_000)
}

function childDueCount(descendants: NodeRecord[], today: Date): number {
  return descendants.filter((node) => {
    if (node.completed) return false
    const until = daysUntil(node.date, today)
    return until !== null && until <= 7
  }).length
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
      if (area && descendants.every((node) => node.completed)) continue
    }

    let density: NodeDensity
    if (child.completed) {
      density = 'compact'
    } else if (area) {
      density = areaDensity(descendants, today)
    } else {
      density = leafDensity(child, today)
    }

    views.push({
      node: child,
      density,
      insideCount: descendants.length,
      dueCount: childDueCount(descendants, today),
      staleDays: childStaleDays(child, now),
    })
  }

  return views
}
