import { expect, test } from '@playwright/test'
import { signIn, selectFirstNode, requireE2ECredentials } from './helpers'

test.beforeEach(requireE2ECredentials)

test('root node appears and keyboard creation adds child and sibling nodes', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Main').first()).toBeVisible()
  await selectFirstNode(page)

  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.getByLabel('Title').fill(`Child ${Date.now()}`)
  await page.keyboard.press('Enter')
  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 15_000 })

  await page.keyboard.press('Escape')
  await selectFirstNode(page)
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Title')).toBeFocused()
})
