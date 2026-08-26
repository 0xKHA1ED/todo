import { createClient } from '@supabase/supabase-js'
import { expect, type Page, test } from '@playwright/test'

export const hasE2ECredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD)
export const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key'),
)

export function requireE2ECredentials() {
  test.skip(!hasE2ECredentials, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Supabase-backed E2E tests.')
}

const ROOT_DESCRIPTION = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
})

async function createAuthenticatedE2EClient() {
  requireE2ECredentials()

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_USER_EMAIL!,
    password: process.env.E2E_USER_PASSWORD!,
  })

  if (error) throw error

  const userId = data.user?.id ?? data.session?.user.id
  if (!userId) {
    throw new Error('Failed to resolve the authenticated E2E user.')
  }

  return { supabase, userId }
}

export async function requireSystemRoleMigration() {
  const { supabase, userId } = await createAuthenticatedE2EClient()

  const { error } = await supabase.from('nodes').select('system_role').eq('user_id', userId).limit(1)
  await supabase.auth.signOut()

  if (error) {
    test.skip(true, `Apply supabase/migrations/004_add_system_role.sql before running this test. BLOCKED: ${JSON.stringify(error)}`)
  }
}

async function resetE2EState() {
  const { supabase, userId } = await createAuthenticatedE2EClient()

  const { error: deleteError } = await supabase.from('nodes').delete().eq('user_id', userId)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase.from('nodes').insert({
    user_id: userId,
    parent_id: null,
    title: 'Main',
    urgency: 'normal',
    tags: [],
    description: ROOT_DESCRIPTION,
    sort_order: 0,
  })
  if (insertError) throw insertError

  await supabase.auth.signOut()
}

export async function updateRootNode(patch: {
  title?: string
  urgency?: 'low' | 'normal' | 'high'
  tags?: string[]
}) {
  const { supabase, userId } = await createAuthenticatedE2EClient()

  const { error } = await supabase.from('nodes').update(patch).eq('user_id', userId).is('parent_id', null)
  if (error) throw error

  await supabase.auth.signOut()
}

export async function requireLifePmMigration() {
  const { supabase, userId } = await createAuthenticatedE2EClient()

  const { error } = await supabase.from('nodes').select('kind').eq('user_id', userId).limit(1)
  await supabase.auth.signOut()

  if (error) {
    test.skip(true, `Apply supabase/migrations/005_life_pm.sql before running this test. BLOCKED: ${JSON.stringify(error)}`)
  }
}

const GRANDFATHERED_STAGE_STATUS = {
  problem: 'complete',
  shape: 'complete',
  plan: 'complete',
  spec: 'complete',
  execute: 'in_progress',
  review: 'not_started',
}

export async function seedNodeTree(
  nodes: Array<{
    title: string
    parentTitle?: string
    urgency?: 'low' | 'normal' | 'high'
    tags?: string[]
    date?: string | null
    completed?: boolean
    last_visited_at?: string | null
    kind?: 'domain' | 'project' | 'module' | 'task'
    workflow_stage?: 'problem' | 'shape' | 'plan' | 'spec' | 'execute' | 'review' | null
    pm_status?: 'idea' | 'active' | 'paused' | 'done' | 'archived'
    outcome?: string
    health?: 'on_track' | 'at_risk' | 'stalled' | 'blocked' | null
    break_glass?: { used: boolean; reason: string; at: string } | null
  }>,
) {
  const { supabase, userId } = await createAuthenticatedE2EClient()

  const { data: root, error: rootError } = await supabase
    .from('nodes')
    .select('id')
    .eq('user_id', userId)
    .is('parent_id', null)
    .single()
  if (rootError) throw rootError

  const idsByTitle = new Map<string, string>([['Main', root.id]])

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    const parentTitle = node.parentTitle ?? 'Main'
    const parentId = idsByTitle.get(parentTitle)
    if (!parentId) throw new Error(`Missing parent node "${node.parentTitle}".`)

    const underRoot = parentTitle === 'Main'
    const kind = node.kind ?? (underRoot ? 'project' : 'task')
    const workflowStage =
      node.workflow_stage !== undefined
        ? node.workflow_stage
        : kind === 'project' || kind === 'module'
          ? underRoot
            ? 'execute'
            : 'problem'
          : null

    const { data, error } = await supabase
      .from('nodes')
      .insert({
        user_id: userId,
        parent_id: parentId,
        title: node.title,
        urgency: node.urgency ?? 'normal',
        tags: node.tags ?? [],
        description: ROOT_DESCRIPTION,
        sort_order: index,
        kind,
        pm_status: node.pm_status ?? 'active',
        outcome: node.outcome ?? '',
        workflow_stage: workflowStage,
        stage_status: workflowStage === 'execute' ? GRANDFATHERED_STAGE_STATUS : {},
        ...(node.date !== undefined ? { date: node.date } : {}),
        ...(node.completed !== undefined ? { completed: node.completed } : {}),
        ...(node.last_visited_at !== undefined ? { last_visited_at: node.last_visited_at } : {}),
        ...(node.health !== undefined ? { health: node.health } : {}),
        ...(node.break_glass !== undefined ? { break_glass: node.break_glass } : {}),
      })
      .select('id')
      .single()
    if (error) throw error
    idsByTitle.set(node.title, data.id)
  }

  await supabase.auth.signOut()
}

export async function signIn(page: Page) {
  requireE2ECredentials()
  await requireLifePmMigration()
  await resetE2EState()
  await page.goto('/login/')
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!)
  await page.locator('input[type="password"]').fill(process.env.E2E_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/map\/?$/, { timeout: 30_000 })
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
  await expect(page.getByText('Add a domain or project')).toBeVisible()
}

export async function goHome(page: Page) {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  if (!(await page.getByTestId('portfolio-dashboard').isVisible().catch(() => false))) {
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Home' }).click()
  }
  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
}

export async function openQuickCapture(page: Page) {
  await page.getByRole('button', { name: 'C', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Quick capture' })).toBeVisible()
}

export function panelEditor(page: Page) {
  return page.getByRole('dialog').filter({ has: page.getByLabel('Title') }).locator('.tiptap')
}

export async function openProjectCard(page: Page, title: string) {
  const card = page.getByTestId('project-card').filter({ hasText: title }).first()
  await expect(card).toBeVisible()
  await card.click()
}

export async function openMapTab(page: Page) {
  await page.getByRole('button', { name: 'Map' }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

export async function addProject(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add project' }).click()
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()
}

export async function selectFirstNode(page: Page) {
  const node = page.locator('.react-flow__node').first()
  await expect(node).toBeVisible()
  await node.click()
  return node
}

export async function fitCanvas(page: Page) {
  const fitButton = page.getByRole('button', { name: 'Fit', exact: true })
  await expect(fitButton).toBeVisible()
  await fitButton.click()
}

export async function selectNodeByTitle(page: Page, title: string) {
  await fitCanvas(page)
  const node = page.locator('.react-flow__node', { hasText: title }).first()
  await expect(node).toBeVisible()
  await node.click()
  return node
}

export async function closePanel(page: Page) {
  const dialog = page.getByRole('dialog').last()
  const closeButton = dialog.getByRole('button', { name: 'Close' })
  await expect(dialog).toBeVisible()
  await expect(closeButton).toBeVisible()
  await closeButton.click()
  await expect(dialog).toBeHidden()
}
