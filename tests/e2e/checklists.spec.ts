import { expect, test } from '@playwright/test'
import { requireE2ECredentials, requireSystemRoleMigration, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireSystemRoleMigration()
})

test('inline checklists update step progress and auto-complete the node', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Add a project')).toBeVisible()
  await page.getByRole('button', { name: 'Add' }).click()

  const title = `Checklist ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()

  const editor = page.locator('.tiptap')
  await editor.click()
  await page.getByRole('button', { name: 'Checklist' }).click()
  await page.keyboard.type('Bring ID')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Form 23B')

  await expect(page.getByText('0/2 steps').first()).toBeVisible()

  const checkboxes = page.locator('.tiptap input[type="checkbox"]')
  await expect(checkboxes).toHaveCount(2)

  await checkboxes.nth(0).check()
  await expect(page.getByText('1/2 steps')).toBeVisible()

  await checkboxes.nth(1).check()
  await expect(page.getByText('2/2 steps')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark Uncompleted' })).toBeVisible({ timeout: 2_500 })

  await checkboxes.nth(1).uncheck()
  await expect(page.getByText('1/2 steps')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark Completed' })).toBeVisible({ timeout: 2_500 })
})