import { describe, expect, it } from 'vitest'
import { LIFE_PM_DEFAULTS } from '@/lib/life-pm/types'
import type { NodeRecord } from '@/types'
import { groupByDomain, listProjects, pickAttentionModule, portfolioStatusSections, projectStageIndicator } from './portfolioModel'

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
const now = new Date('2026-08-26T00:00:00.000Z')

describe('listProjects / groupByDomain', () => {
  it('groups root projects as Uncategorized and domain children under the domain', () => {
    const ims = node({ id: 'ims', title: 'IMS', kind: 'domain', domain_tag: 'professional' })
    const auth = node({ id: 'auth', title: 'Auth refactor', parent_id: 'ims', kind: 'project', pm_status: 'active' })
    const flooring = node({ id: 'floor', title: 'Flooring', kind: 'project', pm_status: 'active' })
    const nodes = [home, ims, auth, flooring]
    expect(listProjects(nodes).map((item) => item.id).sort()).toEqual(['auth', 'floor'])
    const groups = groupByDomain(nodes, [auth, flooring])
    expect(groups.map((group) => group.label)).toEqual(['IMS', 'Uncategorized'])
    expect(groups[0]?.projects.map((item) => item.title)).toEqual(['Auth refactor'])
    expect(groups[1]?.projects.map((item) => item.title)).toEqual(['Flooring'])
  })
})

describe('portfolioStatusSections', () => {
  it('puts active projects in the expanded Active section', () => {
    const project = node({ id: 'p', title: 'Auth', kind: 'project', pm_status: 'active' })
    const paused = node({ id: 'q', title: 'Paused one', kind: 'project', pm_status: 'paused' })
    const sections = portfolioStatusSections([home, project, paused])
    expect(sections.find((section) => section.id === 'active')?.collapsed).toBe(false)
    expect(sections.find((section) => section.id === 'paused')?.collapsed).toBe(true)
    expect(sections.find((section) => section.id === 'active')?.projects.map((item) => item.id)).toEqual(['p'])
  })
})

describe('pickAttentionModule', () => {
  const project = node({ id: 'proj', title: 'Platform', kind: 'project' })

  it('prefers a break-glass execute module', () => {
    const token = node({
      id: 'token',
      title: 'Token refresh',
      parent_id: 'proj',
      kind: 'module',
      workflow_stage: 'execute',
      break_glass: { used: true, reason: 'prod down', at: '2026-08-26T00:00:00.000Z' },
    })
    const billing = node({
      id: 'billing',
      title: 'Billing',
      parent_id: 'proj',
      kind: 'module',
      health: 'blocked',
      workflow_stage: 'problem',
    })
    expect(pickAttentionModule([home, project, token, billing], 'proj', now)?.title).toBe('Token refresh')
  })

  it('then prefers a blocked leaf', () => {
    const blocked = node({
      id: 'blocked',
      title: 'Blocked leaf',
      parent_id: 'proj',
      kind: 'module',
      health: 'blocked',
      workflow_stage: 'shape',
    })
    const other = node({
      id: 'other',
      title: 'Other',
      parent_id: 'proj',
      kind: 'module',
      workflow_stage: 'problem',
    })
    expect(pickAttentionModule([home, project, blocked, other], 'proj', now)?.title).toBe('Blocked leaf')
  })

  it('then prefers the earliest incomplete workflow stage', () => {
    const shape = node({
      id: 'shape',
      title: 'Zebra shape',
      parent_id: 'proj',
      kind: 'module',
      workflow_stage: 'shape',
    })
    const problem = node({
      id: 'problem',
      title: 'Alpha problem',
      parent_id: 'proj',
      kind: 'module',
      workflow_stage: 'problem',
    })
    expect(pickAttentionModule([home, project, shape, problem], 'proj', now)?.title).toBe('Alpha problem')
  })

  it('then prefers a stale active leaf', () => {
    const stale = node({
      id: 'stale',
      title: 'Dusty',
      parent_id: 'proj',
      kind: 'module',
      pm_status: 'active',
      workflow_stage: 'execute',
      stage_status: { execute: 'complete' },
      last_visited_at: '2026-07-01T00:00:00.000Z',
    })
    const fresh = node({
      id: 'fresh',
      title: 'Fresh',
      parent_id: 'proj',
      kind: 'module',
      pm_status: 'active',
      workflow_stage: 'execute',
      stage_status: { execute: 'complete' },
      last_visited_at: '2026-08-25T00:00:00.000Z',
    })
    expect(pickAttentionModule([home, project, stale, fresh], 'proj', now)?.title).toBe('Dusty')
  })

  it('returns at most one module and omits when nothing needs attention', () => {
    const healthy = node({
      id: 'ok',
      title: 'Healthy',
      parent_id: 'proj',
      kind: 'module',
      workflow_stage: 'execute',
      stage_status: { execute: 'complete' },
      last_visited_at: '2026-08-25T00:00:00.000Z',
    })
    expect(pickAttentionModule([home, project, healthy], 'proj', now)).toBeNull()
  })

  it('looks through nested container modules', () => {
    const auth = node({ id: 'auth', title: 'Auth', parent_id: 'proj', kind: 'module' })
    const token = node({
      id: 'token',
      title: 'Token refresh',
      parent_id: 'auth',
      kind: 'module',
      health: 'blocked',
      workflow_stage: 'problem',
    })
    expect(pickAttentionModule([home, project, auth, token], 'proj', now)?.title).toBe('Token refresh')
  })
})

describe('projectStageIndicator', () => {
  it('uses the leaf project workflow stage when the project has no modules', () => {
    const project = node({ id: 'proj', title: 'Flooring', kind: 'project', workflow_stage: 'shape', stage_status: { shape: 'in_progress' } })
    expect(projectStageIndicator([home, project], 'proj')).toEqual({ stage: 'shape', light: 'in_progress' })
  })

  it('summarizes container projects by the earliest active descendant leaf stage', () => {
    const project = node({ id: 'proj', title: 'Platform', kind: 'project' })
    const auth = node({ id: 'auth', title: 'Auth', parent_id: 'proj', kind: 'module' })
    const token = node({ id: 'token', title: 'Token refresh', parent_id: 'auth', kind: 'module', workflow_stage: 'spec', stage_status: { spec: 'in_progress' } })
    const billing = node({ id: 'billing', title: 'Billing', parent_id: 'proj', kind: 'module', workflow_stage: 'plan', stage_status: { plan: 'in_progress' } })
    expect(projectStageIndicator([home, project, auth, token, billing], 'proj')).toEqual({ stage: 'plan', light: 'in_progress' })
  })
})
