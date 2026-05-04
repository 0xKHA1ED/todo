import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function CustomEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  })

  return <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: 'hsl(var(--border))', strokeWidth: 1.5 }} />
}
