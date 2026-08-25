import { expect, test } from '@playwright/test'
import { fitCanvas, requireE2ECredentials, requireSystemRoleMigration, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireSystemRoleMigration()
})

test('quick capture adds an inbox item and File moves it under a project', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Add a project')).toBeVisible()

  const projectTitle = `Project ${Date.now()}`
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Title').fill(projectTitle)
  await page.getByLabel('Title').blur()
  await page.keyboard.press('Escape')

  await page.keyboard.press('c')
  const dialog = page.getByRole('dialog', { name: 'Quick capture' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Title').fill('Bank form #errands')
  await dialog.getByRole('button', { name: 'Add to Inbox' }).click()
  await expect(dialog).toBeHidden()

  const inboxSection = page.locator('section', { has: page.getByText('Inbox') }).first()
  await expect(inboxSection.getByText('Bank form')).toBeVisible()
  await expect(inboxSection.getByText('errands')).toBeVisible()

  await inboxSection.getByRole('button', { name: 'File' }).click()
  await expect(page.getByText('Click a visible subtree to move "Bank form". Press Esc to cancel.')).toBeVisible()
  const projectNode = page.locator('.react-flow__node', { hasText: projectTitle }).first()
  await expect(projectNode).toBeVisible()
  await projectNode.click()

  await expect(inboxSection.getByText('Bank form')).toHaveCount(0)

  await fitCanvas(page)
  await expect(projectNode).toBeVisible()
  await projectNode.dblclick()
  await expect(page.locator('.react-flow__node', { hasText: 'Bank form' })).toBeVisible()
})