import { expect, test } from '@playwright/test'
import { fitCanvas, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('focus mode confirms and isolates a node subtree until exit', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Focus parent' },
    { title: 'Focus grandchild', parentTitle: 'Focus parent' },
    { title: 'Hidden sibling' },
  ])
  await page.reload()
  await fitCanvas(page)

  const focusParent = page.locator('.react-flow__node', { hasText: 'Focus parent' }).first()
  await expect(focusParent).toBeVisible()

  const focusButton = focusParent.getByRole('button', { name: 'Focus on Focus parent' })
  await expect(focusButton).toBeVisible()

  const dialogPromise = page.waitForEvent('dialog')
  await focusButton.focus()
  await page.keyboard.press('Enter')
  const dialog = await dialogPromise
  expect(dialog.message()).toContain('Focus on "Focus parent"')
  await dialog.accept()

  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.locator('.react-flow__node', { hasText: 'Focus parent' })).toBeVisible()
  await expect(page.locator('.react-flow__node', { hasText: 'Focus grandchild' })).toBeVisible()
  await expect(page.locator('.react-flow__node', { hasText: 'Hidden sibling' })).toHaveCount(0)
  await expect(page.locator('.react-flow__node', { hasText: 'Main' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Exit focus' }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(4)
  await expect(page.locator('.react-flow__node', { hasText: 'Hidden sibling' })).toBeVisible()
})
