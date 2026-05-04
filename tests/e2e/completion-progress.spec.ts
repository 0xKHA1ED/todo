import { expect, test } from '@playwright/test'
import { closePanel, requireE2ECredentials, selectNodeByTitle, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('completed tasks toggle and parent cards show subtree progress', async ({ page }) => {
  await signIn(page)
  await selectNodeByTitle(page, 'Main')

  await page.keyboard.press('Tab')
  await page.getByLabel('Title').fill('Completed child')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Mark Completed' }).click()
  await expect(page.getByRole('button', { name: 'Mark Uncompleted' })).toBeVisible()
  await closePanel(page)

  await selectNodeByTitle(page, 'Main')
  await page.keyboard.press('Tab')
  await page.getByLabel('Title').fill('Open child')
  await page.keyboard.press('Enter')
  await closePanel(page)

  const rootNode = page.locator('.react-flow__node', { hasText: 'Main' }).first()
  await expect(rootNode).toContainText('50%')

  await selectNodeByTitle(page, 'Completed child')
  await page.getByRole('button', { name: 'Mark Uncompleted' }).click()
  await closePanel(page)

  await expect(rootNode).toContainText('0%')
})