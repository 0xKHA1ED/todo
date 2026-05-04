import { expect, test } from '@playwright/test'
import { requireE2ECredentials, signIn, updateRootNode } from './helpers'

test.beforeEach(requireE2ECredentials)

test('urgency and tag filters hide non-matching nodes and clear restores the map', async ({ page }) => {
  await signIn(page)
  await updateRootNode({ urgency: 'high', tags: ['filter-e2e'] })
  await page.reload()

  await page.getByRole('button', { name: 'high' }).click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
  const tagFilter = page.getByPlaceholder('Filter tag...')
  await tagFilter.fill('filter-e2e')
  await tagFilter.press('Enter')
  const clearButton = page.locator('button').filter({ hasText: 'Clear' })
  await expect(clearButton).toBeVisible()
  await clearButton.click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
})
