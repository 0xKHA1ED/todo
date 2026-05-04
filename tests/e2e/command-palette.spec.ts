import { expect, test } from '@playwright/test'
import { requireE2ECredentials, selectFirstNode, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('ctrl+k searches nodes and opens the selected result', async ({ page }) => {
  await signIn(page)
  await selectFirstNode(page)
  const title = `Palette ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  await page.getByPlaceholder('Search titles and descriptions...').fill(title)
  await page.getByRole('option', { name: new RegExp(title) }).click()
  await expect(page.getByLabel('Title')).toHaveValue(title)
})
