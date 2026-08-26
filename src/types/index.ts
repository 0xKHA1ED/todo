import type { Node, Edge } from '@xyflow/react'
import type {
  BreakGlass,
  DecisionLogEntry,
  DomainTag,
  Health,
  NodeKind,
  PmStatus,
  StageDocsMap,
  StageStatusMap,
  StageSummariesMap,
  WorkflowStage,
} from '@/lib/life-pm/types'

export type {
  BreakGlass,
  DecisionLogEntry,
  DomainTag,
  Health,
  NodeKind,
  PmStatus,
  StageDocsMap,
  StageStatusMap,
  StageSummariesMap,
  ViewMode,
  WorkflowStage,
} from '@/lib/life-pm/types'

export type Urgency = 'low' | 'normal' | 'high'

export interface NodeRecord {
  id: string
  user_id: string
  parent_id: string | null
  system_role: 'inbox' | null
  title: string
  completed: boolean
  urgency: Urgency
  date: string | null
  tags: string[]
  description: string
  position_x: number
  position_y: number
  sort_order: number
  created_at: string
  updated_at: string
  last_visited_at: string | null
  kind: NodeKind | null
  pm_status: PmStatus
  outcome: string
  domain_tag: DomainTag | null
  health: Health | null
  workflow_stage: WorkflowStage | null
  stage_status: StageStatusMap
  stage_docs: StageDocsMap
  stage_summaries: StageSummariesMap
  decisions: DecisionLogEntry[]
  open_questions: string[]
  break_glass: BreakGlass | null
}

export interface CreateNodePayload {
  parent_id: string | null
  system_role?: NodeRecord['system_role']
  title?: string
  urgency?: Urgency
  date?: string | null
  tags?: string[]
  description?: string
  sort_order?: number
  kind?: NodeKind | null
  pm_status?: PmStatus
  outcome?: string
  domain_tag?: DomainTag | null
  health?: Health | null
  workflow_stage?: WorkflowStage | null
  stage_status?: StageStatusMap
  stage_docs?: StageDocsMap
  stage_summaries?: StageSummariesMap
  decisions?: DecisionLogEntry[]
  open_questions?: string[]
  break_glass?: BreakGlass | null
  confirmContainer?: boolean
}

export type UpdateNodePayload = Partial<
  Pick<
    NodeRecord,
    | 'parent_id'
    | 'title'
    | 'completed'
    | 'urgency'
    | 'date'
    | 'tags'
    | 'description'
    | 'position_x'
    | 'position_y'
    | 'sort_order'
    | 'last_visited_at'
    | 'kind'
    | 'pm_status'
    | 'outcome'
    | 'domain_tag'
    | 'health'
    | 'workflow_stage'
    | 'stage_status'
    | 'stage_docs'
    | 'stage_summaries'
    | 'decisions'
    | 'open_questions'
    | 'break_glass'
  >
>

export interface NodeProgressSummary {
  totalSubtaskCount: number
  completedSubtaskCount: number
  completionPercent: number
}

export type NodeDensity = 'loud' | 'medium' | 'area' | 'compact'

export type NodeData = NodeRecord &
  NodeProgressSummary & {
    density: NodeDensity
    isArea: boolean
    insideCount: number
    dueCount: number
    attentionCount: number
    staleDays: number | null
  } & Record<string, unknown>
export type FlowNode = Node<NodeData, 'customNode'>
export type FlowEdge = Edge<Record<string, never>, 'customEdge'>

export interface CommandSearchResult {
  id: string
  title: string
  descriptionPreview: string
  tags: string[]
}
