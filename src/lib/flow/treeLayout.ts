import type { FlowEdge, FlowNode, NodeDensity, NodeRecord, NodeProgressSummary } from '@/types'
import { visibleChildren } from '@/lib/place/placeModel'

export const DENSITY_SIZE = {
  loud: { width: 252, height: 108 },
  medium: { width: 224, height: 92 },
  area: { width: 232, height: 94 },
  compact: { width: 188, height: 62 },
} as const

export const NODE_SIZE = DENSITY_SIZE.loud
const NODE_GAP = 20
const PACKED_ROW_WIDTH = 780

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

function buildProgressLookup(dbNodes: NodeRecord[]) {
  const childrenByParent = new Map<string, NodeRecord[]>()
  const progressByNode = new Map<string, NodeProgressSummary>()

  dbNodes.forEach((node) => {
    if (!node.parent_id) return
    const siblings = childrenByParent.get(node.parent_id) ?? []
    siblings.push(node)
    childrenByParent.set(node.parent_id, siblings)
  })

  const visit = (nodeId: string): Pick<NodeProgressSummary, 'totalSubtaskCount' | 'completedSubtaskCount'> => {
    const cached = progressByNode.get(nodeId)
    if (cached) {
      return {
        totalSubtaskCount: cached.totalSubtaskCount,
        completedSubtaskCount: cached.completedSubtaskCount,
      }
    }

    const children = childrenByParent.get(nodeId) ?? []
    const summary = children.reduce(
      (accumulator, child) => {
        const childSummary = visit(child.id)
        accumulator.totalSubtaskCount += 1 + childSummary.totalSubtaskCount
        accumulator.completedSubtaskCount += (child.completed ? 1 : 0) + childSummary.completedSubtaskCount
        return accumulator
      },
      { totalSubtaskCount: 0, completedSubtaskCount: 0 },
    )

    return summary
  }

  dbNodes.forEach((node) => {
    const summary = visit(node.id)
    const totalCount = summary.totalSubtaskCount || 1
    const completedCount = summary.totalSubtaskCount === 0 ? (node.completed ? 1 : 0) : summary.completedSubtaskCount

    progressByNode.set(node.id, {
      ...summary,
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

  const packedOriginY = sizedViews
    .filter((entry) => entry.hasStoredPosition)
    .reduce((maxY, entry) => Math.max(maxY, entry.view.node.position_y + entry.size.height + NODE_GAP), 0)

  let packedX = 0
  let packedY = packedOriginY
  let rowHeight = 0

  const nodes: FlowNode[] = sizedViews.map(({ view, size, hasStoredPosition }) => {
    const position = hasStoredPosition
      ? { x: view.node.position_x, y: view.node.position_y }
      : (() => {
          if (packedX > 0 && packedX + size.width > PACKED_ROW_WIDTH) {
            packedX = 0
            packedY += rowHeight + NODE_GAP
            rowHeight = 0
          }

          const nextPosition = { x: packedX, y: packedY }
          packedX += size.width + NODE_GAP
          rowHeight = Math.max(rowHeight, size.height)
          return nextPosition
        })()

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
