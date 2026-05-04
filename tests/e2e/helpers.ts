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

export async function signIn(page: Page) {
  requireE2ECredentials()
  await page.goto('/login/')
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!)
  await page.locator('input[type="password"]').fill(process.env.E2E_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/map\/?$/)
}

export async function selectFirstNode(page: Page) {
  const node = page.locator('.react-flow__node').first()
  await expect(node).toBeVisible()
  await node.click()
  return node
}
