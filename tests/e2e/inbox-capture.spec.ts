import { expect, test } from '@playwright/test'
import { fitCanvas, requireE2ECredentials, requireSystemRoleMigration, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireSystemRoleMigration()
})

test('quick capture adds an inbox item and File moves it under a project', async ({ page }) => {
  await signIn(page)

  const projectTitle = `Project ${Date.now()}`
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Title').fill(projectTitle)
  await page.getByLabel('Title').blur()
  await page.keyboard.press('Escape')

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+N' : 'Control+Shift+N')
  const dialog = page.getByRole('dialog', { name: 'Quick capture' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Title').fill('Bank form #errands')
  await dialog.getByRole('button', { name: 'Add to Inbox' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByText('Bank form')).toBeVisible()
  await expect(page.getByText('errands')).toBeVisible()

  await page.getByRole('button', { name: 'File' }).click()
  await page.getByPlaceholder('Search destinations...').fill(projectTitle)
  await page.keyboard.press('Enter')

  await expect(page.getByText('Bank form')).toHaveCount(0)

  await fitCanvas(page)
  const projectNode = page.locator('.react-flow__node', { hasText: projectTitle }).first()
  await expect(projectNode).toBeVisible()
  await projectNode.dblclick()
  await expect(page.locator('.react-flow__node', { hasText: 'Bank form' })).toBeVisible()
})