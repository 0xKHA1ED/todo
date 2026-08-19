import { expect, test } from '@playwright/test'
import { hasSupabaseEnv } from './helpers'

test('login offers forgot password and email code links', async ({ page }) => {
  await page.goto('/login/')
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Email me a code instead' })).toBeVisible()
})

test('forgot-password form shows generic success copy', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/forgot-password/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('If that email has an account, we sent a reset link.')).toBeVisible()
})

test('reset-password without a session shows expired state', async ({ page }) => {
  await page.goto('/reset-password/')
  await expect(page.getByText('This reset link is invalid or expired')).toBeVisible()
  await expect(page.getByRole('link', { name: /forgot-password|request another/i })).toBeVisible()
})

test('email-code form shows the code field after submit', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/login/code/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByText('If that email has an account, we sent a code.')).toBeVisible()
  await expect(page.getByLabel('Code')).toBeVisible()
})

test('code field rejects empty submit', async ({ page }) => {
  test.skip(!hasSupabaseEnv, 'Supabase env is not configured.')
  await page.goto('/login/code/')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByLabel('Code')).toBeVisible()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Enter the code from your email.')).toBeVisible()
})
