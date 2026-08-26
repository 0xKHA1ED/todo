import { expect, test } from '@playwright/test'
import { addProject, requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('ctrl+k searches nodes and opens the selected result', async ({ page }) => {
  await signIn(page)
  const title = `Palette ${Date.now()}`
  await addProject(page, title)
  await page.keyboard.press('Escape')
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  await page.getByPlaceholder('Search titles and descriptions...').fill(title)
  await expect(page.getByRole('option', { name: new RegExp(title) })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Title')).toHaveValue(title)
})
