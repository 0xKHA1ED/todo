import { expect, test } from '@playwright/test'
import { requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('home place hides the root and Add creates a child on the canvas', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.locator('.react-flow__node', { hasText: 'Main' })).toHaveCount(0)
  await expect(page.locator('.react-flow__node', { hasText: 'Inbox' })).toHaveCount(1)
  await expect(page.getByText('Add a project')).toBeVisible()

  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.getByLabel('Title').fill(`Child ${Date.now()}`)
  await page.keyboard.press('Escape')
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
})
