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

export async function seedNodeTree(
  nodes: Array<{
    title: string
    parentTitle?: string
    urgency?: 'low' | 'normal' | 'high'
    tags?: string[]
    date?: string | null
    completed?: boolean
    last_visited_at?: string | null
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
    const parentId = idsByTitle.get(node.parentTitle ?? 'Main')
    if (!parentId) throw new Error(`Missing parent node "${node.parentTitle}".`)

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
        ...(node.date !== undefined ? { date: node.date } : {}),
        ...(node.completed !== undefined ? { completed: node.completed } : {}),
        ...(node.last_visited_at !== undefined ? { last_visited_at: node.last_visited_at } : {}),
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
  await resetE2EState()
  await page.goto('/login/')
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!)
  await page.locator('input[type="password"]').fill(process.env.E2E_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/map\/?$/, { timeout: 30_000 })
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.getByText('Add a project')).toBeVisible()
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
