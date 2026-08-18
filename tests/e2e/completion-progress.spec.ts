import { expect, test } from '@playwright/test'
import { closePanel, requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('completed children hide until Show done reveals them', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Add a project')).toBeVisible()
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByLabel('Title')).toBeFocused()

  const title = `Completed ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()
  await page.getByRole('button', { name: 'Mark Completed' }).click()
  await expect(page.getByRole('button', { name: 'Mark Uncompleted' })).toBeVisible()
  await closePanel(page)

  await expect(page.locator('.react-flow__node', { hasText: title })).toHaveCount(0)

  const showDone = page.getByRole('button', { name: 'Show done' })
  await showDone.click()
  await expect(showDone).toHaveAttribute('aria-pressed', 'true')

  const doneNode = page.locator('.react-flow__node', { hasText: title })
  await expect(doneNode).toBeVisible()
  await expect(doneNode.locator('.mindmap-node-title')).toHaveClass(/line-through|truncate/)
})
