import type { FlowEdge, FlowNode, NodeDensity, NodeRecord, NodeProgressSummary } from '@/types'
import { parseChecklistProgress } from '@/lib/editor/checklistProgress'
import { visibleChildren, type PlaceChildView } from '@/lib/place/placeModel'

export const DENSITY_SIZE = {
  loud: { width: 252, height: 108 },
  medium: { width: 224, height: 92 },
  area: { width: 232, height: 94 },
  compact: { width: 188, height: 62 },
} as const

export const NODE_SIZE = DENSITY_SIZE.loud
const NODE_GAP = 20
const PACKED_ROW_WIDTH = 780
const SPARSE_LAYOUT_MIN_COUNT = 4
const SPARSE_WIDTH_MULTIPLIER = 1.8
const SPARSE_HEIGHT_MULTIPLIER = 2.4
const SPARSE_AREA_MULTIPLIER = 2.6
const COLLISION_SEARCH_STEP = 24

type NodeSize = ReturnType<typeof getNodeSize>
type NodePosition = { x: number; y: number }
type PositionedNodeBounds = { position: NodePosition; size: NodeSize }
type SizedViewEntry = {
  view: PlaceChildView
  size: NodeSize
  hasStoredPosition: boolean
}

function packPositions(entries: SizedViewEntry[]): NodePosition[] {
  let packedX = 0
  let packedY = 0
  let rowHeight = 0

  return entries.map(({ size }) => {
    if (packedX > 0 && packedX + size.width > PACKED_ROW_WIDTH) {
      packedX = 0
      packedY += rowHeight + NODE_GAP
      rowHeight = 0
    }

    const nextPosition = { x: packedX, y: packedY }
    packedX += size.width + NODE_GAP
    rowHeight = Math.max(rowHeight, size.height)
    return nextPosition
  })
}

function measureBounds(entries: PositionedNodeBounds[]) {
  if (entries.length === 0) {
    return { width: 0, height: 0 }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const entry of entries) {
    minX = Math.min(minX, entry.position.x)
    minY = Math.min(minY, entry.position.y)
    maxX = Math.max(maxX, entry.position.x + entry.size.width)
    maxY = Math.max(maxY, entry.position.y + entry.size.height)
  }

  return {
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

function rectanglesOverlap(a: PositionedNodeBounds, b: PositionedNodeBounds) {
  return (
    a.position.x < b.position.x + b.size.width &&
    a.position.x + a.size.width > b.position.x &&
    a.position.y < b.position.y + b.size.height &&
    a.position.y + a.size.height > b.position.y
  )
}

function collides(position: NodePosition, size: NodeSize, occupied: PositionedNodeBounds[]) {
  return occupied.some((entry) => rectanglesOverlap({ position, size }, entry))
}

function resolvePackedPosition(
  initialPosition: NodePosition,
  size: NodeSize,
  occupied: PositionedNodeBounds[],
): NodePosition {
  let candidate = { ...initialPosition }

  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (!collides(candidate, size, occupied)) {
      return candidate
    }

    const nextX = candidate.x + COLLISION_SEARCH_STEP
    if (nextX + size.width <= PACKED_ROW_WIDTH) {
      candidate = { x: nextX, y: candidate.y }
      continue
    }

    candidate = { x: 0, y: candidate.y + COLLISION_SEARCH_STEP }
  }

  return candidate
}

function shouldRepackStoredLayout(entries: SizedViewEntry[], packedPositions: NodePosition[]) {
  const storedEntries = entries.filter((entry) => entry.hasStoredPosition)
  if (entries.length < SPARSE_LAYOUT_MIN_COUNT || storedEntries.length < 2) {
    return false
  }

  const storedBounds = measureBounds(
    storedEntries.map((entry) => ({
      position: { x: entry.view.node.position_x, y: entry.view.node.position_y },
      size: entry.size,
    })),
  )
  const packedBounds = measureBounds(
    entries.map((entry, index) => ({ position: packedPositions[index] ?? { x: 0, y: 0 }, size: entry.size })),
  )

  const storedArea = storedBounds.width * storedBounds.height
  const packedArea = Math.max(1, packedBounds.width * packedBounds.height)

  return (
    storedBounds.width > packedBounds.width * SPARSE_WIDTH_MULTIPLIER ||
    storedBounds.height > packedBounds.height * SPARSE_HEIGHT_MULTIPLIER ||
    storedArea > packedArea * SPARSE_AREA_MULTIPLIER
  )
}

function estimateTitleLines(title: string, width: number): number {
  const normalized = title.trim().replace(/\s+/g, ' ')
  if (!normalized) return 1

  const charsPerLine = Math.max(14, Math.floor((width - 36) / 7.4))
  const words = normalized.split(' ')
  let lines = 1
  let currentLength = 0

  for (const word of words) {
    const segments = Math.max(1, Math.ceil(word.length / charsPerLine))

    if (currentLength === 0) {
      lines += segments - 1
      currentLength = word.length > charsPerLine ? word.length % charsPerLine || charsPerLine : word.length
      continue
    }

    if (currentLength + 1 + word.length <= charsPerLine) {
      currentLength += 1 + word.length
      continue
    }

    lines += segments
    currentLength = word.length > charsPerLine ? word.length % charsPerLine || charsPerLine : word.length
  }

  return lines
}

export function getNodeSize(density: NodeDensity, attentionCount: number, title: string) {
  const base = DENSITY_SIZE[density]
  const cappedAttention = Math.min(attentionCount, 6)
  const width = base.width + cappedAttention * (density === 'compact' ? 10 : 14)
  const titleLines = estimateTitleLines(title, width)
  const extraTitleHeight = Math.max(0, titleLines - 2) * 18
  const extraAttentionHeight = Math.max(0, cappedAttention - 1) * 8

  return {
    width,
    height: base.height + extraTitleHeight + extraAttentionHeight,
  }
}

type SubtreeSummary = Pick<NodeProgressSummary, 'totalSubtaskCount' | 'completedSubtaskCount'>

export function buildProgressLookup(dbNodes: NodeRecord[]) {
  const childrenByParent = new Map<string, NodeRecord[]>()
  const nodesById = new Map<string, NodeRecord>()

  dbNodes.forEach((node) => {
    nodesById.set(node.id, node)
    if (!node.parent_id) return
    const siblings = childrenByParent.get(node.parent_id) ?? []
    siblings.push(node)
    childrenByParent.set(node.parent_id, siblings)
  })

  // Aggregate the subtree rooted at nodeId: every descendant node counts as one
  // step (completed when the node is completed) plus every checklist item found in
  // that node's and its descendants' descriptions. Memoized independently of the
  // exported summaries so the result never depends on dbNodes ordering.
  const subtreeCache = new Map<string, SubtreeSummary>()
  const inProgress = new Set<string>()

  const aggregate = (nodeId: string): SubtreeSummary => {
    const cached = subtreeCache.get(nodeId)
    if (cached) return cached
    if (inProgress.has(nodeId)) return { totalSubtaskCount: 0, completedSubtaskCount: 0 }
    inProgress.add(nodeId)

    const node = nodesById.get(nodeId)
    const ownChecklist = node ? parseChecklistProgress(node.description) : { total: 0, completed: 0 }
    let totalSubtaskCount = ownChecklist.total
    let completedSubtaskCount = ownChecklist.completed

    for (const child of childrenByParent.get(nodeId) ?? []) {
      const childSummary = aggregate(child.id)
      totalSubtaskCount += 1 + childSummary.totalSubtaskCount
      completedSubtaskCount += (child.completed ? 1 : 0) + childSummary.completedSubtaskCount
    }

    const summary: SubtreeSummary = { totalSubtaskCount, completedSubtaskCount }
    inProgress.delete(nodeId)
    subtreeCache.set(nodeId, summary)
    return summary
  }

  const progressByNode = new Map<string, NodeProgressSummary>()
  dbNodes.forEach((node) => {
    const { totalSubtaskCount, completedSubtaskCount } = aggregate(node.id)
    const totalCount = totalSubtaskCount || 1
    const completedCount = totalSubtaskCount === 0 ? (node.completed ? 1 : 0) : completedSubtaskCount

    progressByNode.set(node.id, {
      totalSubtaskCount,
      completedSubtaskCount,
      completionPercent: Math.round((completedCount / totalCount) * 100),
    })
  })

  return progressByNode
}

export function buildFlowGraph(
  dbNodes: NodeRecord[],
  placeId: string,
  showDone: boolean,
  today: Date = new Date(),
  now: Date = new Date(),
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const views = visibleChildren(dbNodes, placeId, showDone, today, now)
  const progressLookup = buildProgressLookup(dbNodes)

  const sizedViews = views.map((view) => ({
    view,
    size: getNodeSize(view.density, view.attentionCount, view.node.title),
    hasStoredPosition: view.node.position_x !== 0 || view.node.position_y !== 0,
  }))
  const packedPositions = packPositions(sizedViews)
  const repackStoredLayout = shouldRepackStoredLayout(sizedViews, packedPositions)
  const occupied = repackStoredLayout
    ? []
    : sizedViews
        .filter((entry) => entry.hasStoredPosition)
        .map((entry) => ({
          position: { x: entry.view.node.position_x, y: entry.view.node.position_y },
          size: entry.size,
        }))

  const nodes: FlowNode[] = sizedViews.map(({ view, size, hasStoredPosition }, index) => {
    const packedPosition = packedPositions[index] ?? { x: 0, y: 0 }
    const position = repackStoredLayout
      ? packedPosition
      : hasStoredPosition
        ? { x: view.node.position_x, y: view.node.position_y }
        : resolvePackedPosition(packedPosition, size, occupied)

    if (repackStoredLayout || !hasStoredPosition) {
      occupied.push({ position, size })
    }

    const flowNode: FlowNode = {
      id: view.node.id,
      type: 'customNode',
      position,
      data: {
        ...view.node,
        ...(progressLookup.get(view.node.id) ?? {
          totalSubtaskCount: 0,
          completedSubtaskCount: 0,
          completionPercent: view.node.completed ? 100 : 0,
        }),
        density: view.density,
        isArea: view.isArea,
        insideCount: view.insideCount,
        dueCount: view.dueCount,
        attentionCount: view.attentionCount,
        staleDays: view.staleDays,
      },
      style: { width: size.width, height: size.height },
    }
    return flowNode
  })
  return { nodes, edges: [] }
}
