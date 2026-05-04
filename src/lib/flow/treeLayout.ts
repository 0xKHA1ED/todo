import dagre from 'dagre'
import type { FlowEdge, FlowNode, NodeData, NodeRecord, NodeProgressSummary } from '@/types'

const NODE_WIDTH = 220
const NODE_HEIGHT = 108
const RANK_SEP = 120
const NODE_SEP = 48

export const NODE_SIZE = {
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
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

export function buildFlowGraph(dbNodes: NodeRecord[], visibleIds: Set<string>): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const visible = dbNodes.filter((node) => visibleIds.has(node.id))
  const progressLookup = buildProgressLookup(dbNodes)
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', ranksep: RANK_SEP, nodesep: NODE_SEP })
  graph.setDefaultEdgeLabel(() => ({}))

  visible.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  visible.forEach((node) => {
    if (node.parent_id && visibleIds.has(node.parent_id)) {
      graph.setEdge(node.parent_id, node.id)
    }
  })

  dagre.layout(graph)

  const nodes: FlowNode[] = visible.map((node) => {
    const layoutNode = graph.node(node.id)
    return {
      id: node.id,
      type: 'customNode',
      position: {
        x: (layoutNode?.x ?? node.position_x) - NODE_WIDTH / 2,
        y: (layoutNode?.y ?? node.position_y) - NODE_HEIGHT / 2,
      },
      data: {
        ...node,
        ...(progressLookup.get(node.id) ?? {
          totalSubtaskCount: 0,
          completedSubtaskCount: 0,
          completionPercent: node.completed ? 100 : 0,
        }),
      } as NodeData,
    }
  })

  const edges: FlowEdge[] = visible
    .filter((node) => node.parent_id && visibleIds.has(node.parent_id))
    .map((node) => ({
      id: `${node.parent_id}-${node.id}`,
      source: node.parent_id!,
      target: node.id,
      type: 'customEdge',
      animated: false,
      data: {},
    }))

  return { nodes, edges }
}
