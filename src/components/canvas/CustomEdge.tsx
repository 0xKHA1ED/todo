import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function CustomEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected }: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      className="mindmap-edge-path"
      style={{
        stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--mindmap-edge))',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: selected ? 2.6 : 1.9,
      }}
    />
  )
}
