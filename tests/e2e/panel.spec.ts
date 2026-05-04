import { expect, test } from '@playwright/test'
import { requireE2ECredentials, selectFirstNode, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('panel edits title, urgency, date, tags, and markdown content', async ({ page }) => {
  await signIn(page)
  await selectFirstNode(page)

  const title = `Edited ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()
  await expect(page.getByText(title).first()).toBeVisible()

  await page.getByRole('button', { name: 'high' }).click()
  await page.getByLabel('Date badge').fill('2026-05-04')
  await page.getByLabel('Tags').fill('e2e, playwright')
  await page.getByLabel('Tags').blur()
  await expect(page.getByText('playwright').first()).toBeVisible()

  await page.locator('.tiptap').fill('Markdown content from Playwright')
  await page.keyboard.press('Escape')
  await selectFirstNode(page)
  await expect(page.locator('.tiptap')).toContainText('Markdown content from Playwright')
})
