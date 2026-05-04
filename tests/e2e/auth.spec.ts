import { expect, test } from '@playwright/test'
import { hasE2ECredentials, hasSupabaseEnv, signIn } from './helpers'

test('unauthenticated users land on login or configuration guidance', async ({ page }) => {
  await page.goto('/map/')
  await expect(page.getByText(/Supabase is not configured|Email\/password auth powered by Supabase/)).toBeVisible()
})

test('login with valid credentials redirects to map', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Supabase E2E credentials are not configured.')
  await signIn(page)
  await expect(page.locator('.react-flow')).toBeVisible()
})

test('login with invalid credentials shows an error', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/login/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.locator('input[type="password"]').fill('invalid-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Sign in failed', { exact: true })).toBeVisible()
})
