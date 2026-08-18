'use client'

import { useCallback, useEffect, useMemo, type MouseEvent } from 'react'
import {
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'
import { buildFlowGraph } from '@/lib/flow/treeLayout'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import type { FlowNode, NodeRecord } from '@/types'
import { CustomEdge } from './CustomEdge'
import { CustomNode } from './CustomNode'
import { useToast } from '@/components/ui/use-toast'

const nodeTypes: NodeTypes = { customNode: CustomNode }
const edgeTypes: EdgeTypes = { customEdge: CustomEdge }

function isDescendant(nodes: NodeRecord[], ancestorId: string, candidateId: string): boolean {
  const children = nodes.filter((node) => node.parent_id === ancestorId)
  return children.some((child) => child.id === candidateId || isDescendant(nodes, child.id, candidateId))
}

export function MindmapCanvas() {
  const { toast } = useToast()
  const dbNodes = useNodeStore((state) => state.nodes)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const updateNode = useNodeStore((state) => state.updateNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const selectNode = useUIStore((state) => state.selectNode)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
  const showDone = useUIStore((state) => state.showDone)
  const root = dbNodes.find((node) => node.parent_id === null)
  const placeId = currentPlaceId ?? root?.id ?? ''
  const flowGraph = useMemo(() => buildFlowGraph(dbNodes, placeId, showDone), [dbNodes, placeId, showDone])
  const visibleChildIds = useMemo(() => new Set(flowGraph.nodes.map((node) => node.id)), [flowGraph.nodes])
  const visibleNodeKey = useMemo(() => flowGraph.nodes.map((node) => node.id).join(','), [flowGraph.nodes])
  const [nodes, setNodes, onNodesChange] = useNodesState(flowGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowGraph.edges)
  const { getIntersectingNodes, fitView } = useReactFlow()

  useEffect(() => {
    setNodes(flowGraph.nodes)
    setEdges(flowGraph.edges)
  }, [flowGraph.edges, flowGraph.nodes, setEdges, setNodes])

  useEffect(() => {
    if (!visibleNodeKey) return
    const timeout = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 })
    }, 50)
    return () => window.clearTimeout(timeout)
  }, [fitView, visibleNodeKey])

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: FlowNode) => {
      if (node.data.insideCount > 0) {
        selectNode(node.id)
        return
      }
      openPanel(node.id)
    },
    [openPanel, selectNode],
  )

  const handleNodeDoubleClick = useCallback(
    (event: MouseEvent, node: FlowNode) => {
      event.stopPropagation()
      enterPlace(node.id)
    },
    [enterPlace],
  )

  const handleNodeDragStop = useCallback(
    async (_event: MouseEvent, draggedNode: FlowNode) => {
      const source = dbNodes.find((node) => node.id === draggedNode.id)
      if (!source) return

      try {
        await updateNode(source.id, {
          position_x: draggedNode.position.x,
          position_y: draggedNode.position.y,
        })

        if (source.parent_id === null) return

        const target = getIntersectingNodes(draggedNode)
          .filter((node) => node.id !== draggedNode.id)
          .find((node) => visibleChildIds.has(node.id))

        if (!target || target.id === source.parent_id) return

        const targetRecord = dbNodes.find((node) => node.id === target.id)
        if (!targetRecord || targetRecord.parent_id === null) return

        if (isDescendant(dbNodes, source.id, target.id)) {
          toast({
            title: 'Cannot re-parent node',
            description: 'That move would create a circular hierarchy.',
            variant: 'destructive',
          })
          return
        }

        await reparentNode(source.id, target.id)
      } catch (error) {
        toast({
          title: 'Drag failed',
          description: error instanceof Error ? error.message : 'The node could not be moved.',
          variant: 'destructive',
        })
      }
    },
    [dbNodes, getIntersectingNodes, reparentNode, toast, updateNode, visibleChildIds],
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        fitView
        minZoom={0.08}
        maxZoom={1.8}
        snapToGrid
        snapGrid={[16, 16]}
        className="mindmap-canvas"
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!border-border !bg-card !text-foreground" />
      </ReactFlow>
    </div>
  )
}
