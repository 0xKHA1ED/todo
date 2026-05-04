import type { Node, Edge } from '@xyflow/react'

export type Urgency = 'low' | 'normal' | 'high'

export interface NodeRecord {
  id: string
  user_id: string
  parent_id: string | null
  title: string
  urgency: Urgency
  date: string | null
  tags: string[]
  description: string
  position_x: number
  position_y: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateNodePayload {
  parent_id: string | null
  title?: string
  urgency?: Urgency
  date?: string | null
  tags?: string[]
  description?: string
  sort_order?: number
}

export type UpdateNodePayload = Partial<
  Pick<NodeRecord, 'parent_id' | 'title' | 'urgency' | 'date' | 'tags' | 'description' | 'position_x' | 'position_y' | 'sort_order'>
>

export type NodeData = NodeRecord & Record<string, unknown>
export type FlowNode = Node<NodeData, 'customNode'>
export type FlowEdge = Edge<Record<string, never>, 'customEdge'>

export interface CommandSearchResult {
  id: string
  title: string
  descriptionPreview: string
}
