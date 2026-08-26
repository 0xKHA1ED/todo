import { expect, test } from '@playwright/test'
import { addProject, requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('home portfolio hides the root and Add project creates a card', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
  await expect(page.locator('.react-flow__node', { hasText: 'Main' })).toHaveCount(0)
  await expect(page.getByText('Add a domain or project')).toBeVisible()

  const title = `Child ${Date.now()}`
  await addProject(page, title)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('project-card').filter({ hasText: title })).toBeVisible()
})
