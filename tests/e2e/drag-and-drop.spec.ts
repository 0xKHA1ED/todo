import { expect, test } from '@playwright/test'
import { closePanel, requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('dragging a non-root node over another node keeps the canvas stable', async ({ page }) => {
  await signIn(page)
  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(0)
  await expect(page.getByText('Add a project')).toBeVisible()

  await page.getByRole('button', { name: 'Add' }).click()
  await expect(nodes).toHaveCount(1, { timeout: 15_000 })
  await closePanel(page)

  await page.getByRole('button', { name: 'Add' }).click()
  await expect(nodes).toHaveCount(2, { timeout: 15_000 })
  await closePanel(page)

  const source = nodes.nth(0)
  const target = nodes.nth(1)
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  test.skip(!sourceBox || !targetBox, 'Node boxes were unavailable.')

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect(page.locator('.react-flow')).toBeVisible()
})
