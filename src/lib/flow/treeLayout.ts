import type { FlowEdge, FlowNode, NodeRecord, NodeProgressSummary } from '@/types'
import { visibleChildren } from '@/lib/place/placeModel'

export const DENSITY_SIZE = {
  loud: { width: 240, height: 92 },
  medium: { width: 200, height: 72 },
  area: { width: 200, height: 72 },
  compact: { width: 168, height: 40 },
} as const

export const NODE_SIZE = DENSITY_SIZE.loud

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

  let fallbackY = 0
  const nodes: FlowNode[] = views.map((view) => {
    const size = DENSITY_SIZE[view.density]
    const hasStoredPosition = view.node.position_x !== 0 || view.node.position_y !== 0
    const position = hasStoredPosition
      ? { x: view.node.position_x, y: view.node.position_y }
      : { x: 0, y: fallbackY }

    fallbackY = Math.max(fallbackY, position.y + size.height + 16)

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
        staleDays: view.staleDays,
      },
      style: { width: size.width, height: size.height },
    }
    return flowNode
  })
  return { nodes, edges: [] }
}
