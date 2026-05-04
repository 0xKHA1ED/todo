import dagre from 'dagre'
import type { FlowEdge, FlowNode, NodeData, NodeRecord } from '@/types'

const NODE_WIDTH = 220
const NODE_HEIGHT = 96
const RANK_SEP = 120
const NODE_SEP = 48

export const NODE_SIZE = {
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
}

export function buildFlowGraph(dbNodes: NodeRecord[], visibleIds: Set<string>): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const visible = dbNodes.filter((node) => visibleIds.has(node.id))
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
      data: node as NodeData,
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
