import { describe, expect, it } from 'vitest'
import type { NodeRecord } from '@/types'
import { LIFE_PM_DEFAULTS } from './types'
import {
  STAGE_ORDER,
  canCreateTask,
  canEditStage,
  canSignOff,
  canSkipReview,
  defaultTitleForKind,
  filingClickAction,
  hasChildModules,
  isValidMoveParent,
  isWorkflowLeaf,
  nextStage,
  trafficLight,
} from './workflowModel'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user',
    parent_id: 'home',
    system_role: null,
    completed: false,
    urgency: 'normal',
    date: null,
    tags: [],
    description: '',
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    ...LIFE_PM_DEFAULTS,
    ...partial,
  }
}

const home = node({ id: 'home', title: 'Main', parent_id: null })

describe('STAGE_ORDER', () => {
  it('locks the six-stage pipeline', () => {
    expect(STAGE_ORDER).toEqual(['problem', 'shape', 'plan', 'spec', 'execute', 'review'])
  })
})

describe('nextStage', () => {
  it('advances through the pipeline and returns null after review', () => {
    expect(nextStage('problem')).toBe('shape')
    expect(nextStage('shape')).toBe('plan')
    expect(nextStage('plan')).toBe('spec')
    expect(nextStage('spec')).toBe('execute')
    expect(nextStage('execute')).toBe('review')
    expect(nextStage('review')).toBeNull()
  })
})

describe('canCreateTask', () => {
  it('returns false when the parent workflow stage is before execute', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'problem',
    })
    expect(canCreateTask(moduleNode, [home, moduleNode])).toBe(false)
  })

  it('returns true when a leaf module is in execute', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'execute',
    })
    expect(canCreateTask(moduleNode, [home, moduleNode])).toBe(true)
  })

  it('returns false for a container module even in execute', () => {
    const parent = node({
      id: 'auth',
      title: 'Auth',
      kind: 'module',
      workflow_stage: 'execute',
    })
    const child = node({
      id: 'token',
      title: 'Token refresh',
      parent_id: 'auth',
      kind: 'module',
      workflow_stage: 'execute',
    })
    expect(canCreateTask(parent, [home, parent, child])).toBe(false)
  })

  it('allows tasks in the inbox', () => {
    const inbox = node({ id: 'inbox', title: 'Inbox', system_role: 'inbox' })
    expect(canCreateTask(inbox, [home, inbox])).toBe(true)
  })
})

describe('canEditStage', () => {
  it('allows editing only the current stage', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'shape',
      stage_status: { problem: 'complete', shape: 'in_progress' },
    })
    expect(canEditStage(moduleNode, 'shape')).toBe(true)
    expect(canEditStage(moduleNode, 'problem')).toBe(false)
    expect(canEditStage(moduleNode, 'plan')).toBe(false)
  })
})

describe('trafficLight', () => {
  it('returns complete, in_progress, not_started, and locked lights', () => {
    const status = {
      problem: 'complete' as const,
      shape: 'in_progress' as const,
    }
    expect(trafficLight('problem', 'shape', status)).toBe('complete')
    expect(trafficLight('shape', 'shape', status)).toBe('in_progress')
    expect(trafficLight('plan', 'shape', status)).toBe('locked')
    expect(trafficLight('execute', 'shape', status)).toBe('locked')
  })

  it('shows not_started for the current stage when status is missing', () => {
    expect(trafficLight('problem', 'problem', {})).toBe('not_started')
  })
})

describe('canSignOff', () => {
  it('allows sign-off when the current stage is marked complete', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'plan',
      stage_status: { plan: 'complete' },
    })
    expect(canSignOff(moduleNode, [home, moduleNode])).toBe(true)
  })

  it('blocks sign-off when required stage sections are missing', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'problem',
      stage_docs: { problem: '<h2>Problem statement</h2><p>Sessions drop.</p>' },
    })
    expect(canSignOff(moduleNode, [home, moduleNode])).toBe(false)
  })

  it('allows sign-off when required non-sign-off checklist items are complete', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'problem',
      stage_docs: {
        problem:
          '<h2>Problem statement</h2><p>Sessions drop.</p>' +
          '<h2>Who</h2><p>Mobile users.</p>' +
          '<h2>Pain</h2><p>Checkout fails.</p>' +
          '<h2>Why now</h2><p>Ticket spike.</p>' +
          '<h2>Constraints</h2><ul><li>Two weeks.</li></ul>' +
          '<h2>Not solving</h2><ul><li>Native apps.</li><li>OAuth migration.</li></ul>',
      },
    })
    expect(canSignOff(moduleNode, [home, moduleNode])).toBe(true)
  })

  it('enforces minimum checklist counts before sign-off', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'spec',
      stage_docs: {
        spec:
          '<h2>Requirements</h2><p>Refresh tokens.</p>' +
          '<h2>Acceptance criteria</h2><ol><li>Works after expiry.</li><li>Shows login modal.</li></ol>' +
          '<h2>Edge cases</h2><ul><li>Two tabs.</li><li>Offline.</li></ul>' +
          '<h2>Verification plan</h2><p>Unit and e2e checks.</p>',
      },
    })
    expect(canSignOff(moduleNode, [home, moduleNode])).toBe(false)
  })

  it('blocks execute sign-off while work items remain open', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'execute',
    })
    const openTask = node({ id: 't1', title: 'Fix cookie', parent_id: 'mod', kind: 'task', completed: false })
    expect(canSignOff(moduleNode, [home, moduleNode, openTask])).toBe(false)
  })

  it('allows execute sign-off when every work item is complete', () => {
    const moduleNode = node({
      id: 'mod',
      title: 'Token refresh',
      kind: 'module',
      workflow_stage: 'execute',
    })
    const doneTask = node({ id: 't1', title: 'Fix cookie', parent_id: 'mod', kind: 'task', completed: true })
    expect(canSignOff(moduleNode, [home, moduleNode, doneTask])).toBe(true)
  })

  it('blocks sign-off on containers', () => {
    const parent = node({
      id: 'auth',
      title: 'Auth',
      kind: 'module',
      workflow_stage: 'plan',
      stage_status: { plan: 'complete' },
    })
    const child = node({
      id: 'token',
      title: 'Token',
      parent_id: 'auth',
      kind: 'module',
    })
    expect(canSignOff(parent, [home, parent, child])).toBe(false)
  })
})

describe('defaultTitleForKind', () => {
  it('names new nodes by kind instead of always calling them tasks', () => {
    expect(defaultTitleForKind('domain')).toBe('New Domain')
    expect(defaultTitleForKind('project')).toBe('New Project')
    expect(defaultTitleForKind('module')).toBe('New Module')
    expect(defaultTitleForKind('task')).toBe('New Task')
  })
})

describe('filingClickAction', () => {
  it('drills into domains and containers, files onto execute leaves, and enters other leaves', () => {
    const domain = node({ id: 'ims', title: 'IMS', kind: 'domain' })
    const container = node({ id: 'platform', title: 'Platform', parent_id: 'ims', kind: 'project' })
    const child = node({ id: 'auth', title: 'Auth', parent_id: 'platform', kind: 'module', workflow_stage: 'problem' })
    const executeLeaf = node({ id: 'floor', title: 'Flooring', kind: 'project', workflow_stage: 'execute' })
    const problemLeaf = node({ id: 'idea', title: 'Idea', kind: 'project', workflow_stage: 'problem' })
    const nodes = [home, domain, container, child, executeLeaf, problemLeaf]

    expect(filingClickAction(nodes, 'ims')).toBe('enter')
    expect(filingClickAction(nodes, 'platform')).toBe('enter')
    expect(filingClickAction(nodes, 'floor')).toBe('file')
    expect(filingClickAction(nodes, 'idea')).toBe('enter')
    expect(filingClickAction(nodes, 'auth')).toBe('enter')
  })
})

describe('isValidMoveParent', () => {
  it('allows projects under domains or home and rejects tasks as destinations', () => {
    const domain = node({ id: 'ims', title: 'IMS', kind: 'domain' })
    const project = node({ id: 'auth', title: 'Auth', parent_id: 'ims', kind: 'project', workflow_stage: 'problem' })
    const other = node({ id: 'floor', title: 'Flooring', kind: 'project', workflow_stage: 'execute' })
    const task = node({ id: 't', title: 'Task', parent_id: 'floor', kind: 'task' })
    const nodes = [home, domain, project, other, task]

    expect(isValidMoveParent(project, domain, nodes)).toBe(true)
    expect(isValidMoveParent(project, home, nodes)).toBe(true)
    expect(isValidMoveParent(project, other, nodes)).toBe(false)
    expect(isValidMoveParent(other, task, nodes)).toBe(false)
    expect(isValidMoveParent(task, other, nodes)).toBe(true)
    expect(isValidMoveParent(task, project, nodes)).toBe(false)
  })
})

describe('canSkipReview / isWorkflowLeaf', () => {
  it('lets modules skip review and requires it for projects', () => {
    const moduleNode = node({ id: 'mod', title: 'Token', kind: 'module', workflow_stage: 'review' })
    const project = node({ id: 'proj', title: 'Auth', kind: 'project', workflow_stage: 'review' })
    expect(canSkipReview(moduleNode)).toBe(true)
    expect(canSkipReview(project)).toBe(false)
  })

  it('treats a project without child modules as a workflow leaf', () => {
    const project = node({ id: 'proj', title: 'Flooring', kind: 'project', workflow_stage: 'problem' })
    expect(isWorkflowLeaf(project, [home, project])).toBe(true)
    expect(hasChildModules([home, project], project.id)).toBe(false)
  })
})
