'use client'

import { useCallback, useEffect, useMemo, type MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import { motion } from 'framer-motion'
import { useFilter } from '@/hooks/useFilter'
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

function minimapColor(node: Node) {
  if (node.data.completed) return '#94a3b8'
  const urgency = node.data.urgency
  if (urgency === 'high') return '#e11d48'
  if (urgency === 'low') return '#2f9e44'
  return '#d97706'
}

export function MindmapCanvas() {
  const { toast } = useToast()
  const dbNodes = useNodeStore((state) => state.nodes)
  const loading = useNodeStore((state) => state.loading)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const updateNode = useNodeStore((state) => state.updateNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const visibleIds = useFilter()
  const flowGraph = useMemo(() => buildFlowGraph(dbNodes, visibleIds), [dbNodes, visibleIds])
  const [nodes, setNodes, onNodesChange] = useNodesState(flowGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowGraph.edges)
  const { getIntersectingNodes, fitView } = useReactFlow()

  useEffect(() => {
    setNodes(flowGraph.nodes)
    setEdges(flowGraph.edges)
  }, [flowGraph.edges, flowGraph.nodes, setEdges, setNodes])

  useEffect(() => {
    if (flowGraph.nodes.length === 0) return
    const timeout = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 })
    }, 50)
    return () => window.clearTimeout(timeout)
  }, [fitView, flowGraph.nodes.length])

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
          .find((node) => visibleIds.has(node.id))

        if (!target || target.id === source.parent_id) return

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
    [dbNodes, getIntersectingNodes, reparentNode, toast, updateNode, visibleIds],
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
        onNodeClick={(_event, node) => openPanel(node.id)}
        onNodeDragStop={handleNodeDragStop}
        fitView
        minZoom={0.08}
        maxZoom={1.8}
        snapToGrid
        snapGrid={[16, 16]}
        className="mindmap-canvas"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={32} size={1} color="hsl(var(--canvas-grid))" className="opacity-45" />
        <Controls className="!border-border !bg-card !text-foreground" />
        <MiniMap
          nodeColor={minimapColor}
          nodeStrokeColor="#ffffff"
          nodeBorderRadius={8}
          maskColor="rgba(15, 23, 42, 0.08)"
          pannable
          zoomable
          className="!border !border-border !bg-card/95 !shadow-lg"
        />
      </ReactFlow>

      {!loading && dbNodes.length > 0 && flowGraph.nodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card/95 px-5 py-4 text-center shadow-lg"
        >
          <p className="font-medium">No nodes match the current filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Clear filters to restore the full mindmap.</p>
        </motion.div>
      )}
    </div>
  )
}
