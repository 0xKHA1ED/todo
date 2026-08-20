'use client'

import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react'
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

function dropTargetIdFromEvent(
  event: MouseEvent,
  draggedNodeId: string,
  visibleChildIds: Set<string>,
): string | null {
  const elements = document.elementsFromPoint(event.clientX, event.clientY)
  for (const element of elements) {
    const wrapper = element.closest('.react-flow__node') as HTMLElement | null
    const candidateId = wrapper?.dataset.id
    if (candidateId && candidateId !== draggedNodeId && visibleChildIds.has(candidateId)) {
      return candidateId
    }
  }
  return null
}

export function MindmapCanvas() {
  const { toast } = useToast()
  const dbNodes = useNodeStore((state) => state.nodes)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const updateNode = useNodeStore((state) => state.updateNode)
  const openPanel = useUIStore((state) => state.openPanel)
  const closePanel = useUIStore((state) => state.closePanel)
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
  const clickTimeoutRef = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: FlowNode) => {
      if (node.data.insideCount === 0) {
        openPanel(node.id)
        return
      }

      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
      }
      clickTimeoutRef.current = window.setTimeout(() => {
        const uiState = useUIStore.getState()
        if (uiState.currentPlaceId !== currentPlaceId || uiState.isPanelOpen) {
          clickTimeoutRef.current = null
          return
        }
        selectNode(node.id)
        clickTimeoutRef.current = null
      }, 180)
    },
    [currentPlaceId, openPanel, selectNode],
  )

  const handleNodeDoubleClick = useCallback(
    (event: MouseEvent, node: FlowNode) => {
      event.stopPropagation()
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      closePanel()
      enterPlace(node.id)
    },
    [closePanel, enterPlace],
  )

  const handleNodeDragStop = useCallback(
    async (event: MouseEvent, draggedNode: FlowNode) => {
      const source = dbNodes.find((node) => node.id === draggedNode.id)
      if (!source) return

      try {
        const dropTargetId =
          source.parent_id === null ? null : dropTargetIdFromEvent(event, draggedNode.id, visibleChildIds)

        const intersectingTarget =
          dropTargetId === null
            ? getIntersectingNodes(draggedNode)
                .filter((node) => node.id !== draggedNode.id)
                .find((node) => visibleChildIds.has(node.id))
            : null

        const targetRecord = dbNodes.find(
          (node) => node.id === (dropTargetId ?? intersectingTarget?.id ?? null),
        )
        const reparentTarget =
          targetRecord && targetRecord.parent_id !== null && targetRecord.id !== source.parent_id
            ? targetRecord
            : null

        if (reparentTarget && isDescendant(dbNodes, source.id, reparentTarget.id)) {
          toast({
            title: 'Cannot re-parent node',
            description: 'That move would create a circular hierarchy.',
            variant: 'destructive',
          })
        }

        if (source.position_x !== draggedNode.position.x || source.position_y !== draggedNode.position.y) {
          await updateNode(source.id, {
            position_x: draggedNode.position.x,
            position_y: draggedNode.position.y,
          })
        }

        if (!reparentTarget) return
        if (isDescendant(dbNodes, source.id, reparentTarget.id)) {
          return
        }

        await reparentNode(source.id, reparentTarget.id)
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
