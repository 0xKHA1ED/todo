export type NodeKind = 'domain' | 'project' | 'module' | 'task'

export type PmStatus = 'idea' | 'active' | 'paused' | 'done' | 'archived'

export type DomainTag = 'professional' | 'home' | 'business' | 'personal' | 'health' | 'other'

export type Health = 'on_track' | 'at_risk' | 'stalled' | 'blocked'

export type WorkflowStage = 'problem' | 'shape' | 'plan' | 'spec' | 'execute' | 'review'

export type StageStatus = 'not_started' | 'in_progress' | 'complete'
export type LifePmStatus = StageStatus
export type LifePmStage = WorkflowStage

export type ViewMode = 'portfolio' | 'hub' | 'think' | 'map' | 'list'

export type TrafficLight = 'complete' | 'in_progress' | 'not_started' | 'locked'

export type StageStatusMap = Partial<Record<WorkflowStage, StageStatus>>
export type StageDocsMap = Partial<Record<WorkflowStage, string>>
export type StageSummariesMap = Partial<Record<WorkflowStage, string>>

export interface DecisionLogEntry {
  date: string
  text: string
}

export interface BreakGlass {
  used: boolean
  reason: string
  at: string
}

export const LIFE_PM_DEFAULTS = {
  kind: null as NodeKind | null,
  pm_status: 'active' as PmStatus,
  outcome: '',
  domain_tag: null as DomainTag | null,
  health: null as Health | null,
  workflow_stage: null as WorkflowStage | null,
  stage_status: {} as StageStatusMap,
  stage_docs: {} as StageDocsMap,
  stage_summaries: {} as StageSummariesMap,
  decisions: [] as DecisionLogEntry[],
  open_questions: [] as string[],
  break_glass: null as BreakGlass | null,
}

export const SUPPORTED_FORMAT_VERSIONS = ['1.0'] as const

export const STAGE_ORDER: WorkflowStage[] = ['problem', 'shape', 'plan', 'spec', 'execute', 'review']

export const STAGE_CHECKLISTS: Record<WorkflowStage, string[]> = {
  problem: [
    'Problem statement',
    'Who',
    'Pain',
    'Why now',
    'Constraints',
    'Not solving (min 2)',
    'Sign-off',
  ],
  shape: ['Options (min 3)', 'Tradeoffs', 'Killed', 'Chosen direction', 'Sign-off'],
  plan: ['Approach', 'Phases', 'Dependencies', 'Risks', 'Non-goals', 'Sign-off'],
  spec: [
    'Requirements',
    'Acceptance criteria (min 3)',
    'Edge cases (min 2)',
    'Verification plan',
    'Sign-off',
  ],
  execute: ['Tasks documented', 'Each task has definition of done', 'Tasks linked to spec criteria (where applicable)'],
  review: ['Problem revisited', 'Surprises', 'Learnings', 'Sign-off'],
}

export const STAGE_SECTIONS: Record<WorkflowStage, string[]> = {
  problem: ['Problem statement', 'Who', 'Pain', 'Why now', 'Constraints', 'Not solving'],
  shape: ['Options', 'Tradeoffs', 'Killed', 'Chosen direction'],
  plan: ['Approach', 'Phases', 'Dependencies', 'Risks', 'Non-goals'],
  spec: ['Requirements', 'Acceptance criteria', 'Edge cases', 'Verification plan'],
  execute: ['Tasks', 'Progress'],
  review: ['Problem revisited', 'Surprises', 'Learnings'],
}

export const META_SECTIONS = ['Locked decisions', 'Open questions', 'Stage checklist'] as const

export function emptyStageStatus(): StageStatusMap {
  return {
    problem: 'not_started',
    shape: 'not_started',
    plan: 'not_started',
    spec: 'not_started',
    execute: 'not_started',
    review: 'not_started',
  }
}

export function grandfatheredStageStatus(): StageStatusMap {
  return {
    problem: 'complete',
    shape: 'complete',
    plan: 'complete',
    spec: 'complete',
    execute: 'in_progress',
    review: 'not_started',
  }
}

export function newLeafStageStatus(): StageStatusMap {
  return {
    ...emptyStageStatus(),
    problem: 'in_progress',
  }
}
