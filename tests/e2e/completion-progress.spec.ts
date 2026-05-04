import { expect, test } from '@playwright/test'
import { closePanel, fitCanvas, requireE2ECredentials, selectNodeByTitle, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('completed tasks toggle and parent cards show subtree progress', async ({ page }) => {
  await signIn(page)
  await selectNodeByTitle(page, 'Main')

  const titleInput = page.getByLabel('Title')
  const panelTitle = page.getByRole('heading', { level: 2 })

  await page.keyboard.press('Tab')
  await expect(panelTitle).toHaveText('New Task')
  await expect(titleInput).toBeFocused()
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 15_000 })
  await titleInput.fill('Completed child')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Mark Completed' }).click()
  await expect(page.getByRole('button', { name: 'Mark Uncompleted' })).toBeVisible()
  await closePanel(page)

  await selectNodeByTitle(page, 'Main')
  await page.keyboard.press('Tab')
  await expect(panelTitle).toHaveText('New Task')
  await expect(titleInput).toBeFocused()
  await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 15_000 })
  await titleInput.fill('Open child')
  await page.keyboard.press('Enter')
  await closePanel(page)

  await fitCanvas(page)
  const rootNode = page.locator('.react-flow__node', { hasText: 'Main' }).first()
  await expect(rootNode).toBeVisible()
  await expect(rootNode).toContainText('50%')

  await selectNodeByTitle(page, 'Completed child')
  await page.getByRole('button', { name: 'Mark Uncompleted' }).click()
  await closePanel(page)

  await fitCanvas(page)
  await expect(rootNode).toContainText('0%')
})