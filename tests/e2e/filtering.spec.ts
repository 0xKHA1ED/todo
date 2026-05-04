import { expect, test } from '@playwright/test'
import { requireE2ECredentials, selectFirstNode, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('urgency and tag filters hide non-matching nodes and clear restores the map', async ({ page }) => {
  await signIn(page)
  await selectFirstNode(page)
  await page.getByRole('button', { name: 'high' }).click()
  await page.getByLabel('Tags').fill('filter-e2e')
  await page.getByLabel('Tags').blur()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'high' }).first().click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
  await page.getByPlaceholder('Filter tag...').fill('filter-e2e')
  await page.keyboard.press('Enter')
  await expect(page.getByText('filter-e2e').first()).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('.react-flow__node').first()).toBeVisible()
})
