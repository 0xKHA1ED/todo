import { expect, test } from '@playwright/test'
import { openQuickCapture, requireE2ECredentials, requireLifePmMigration, requireSystemRoleMigration, seedNodeTree, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireSystemRoleMigration()
  await requireLifePmMigration()
})

test('quick capture adds an inbox item and File moves it under an execute project', async ({ page }) => {
  await signIn(page)
  const projectTitle = `Project ${Date.now()}`
  await seedNodeTree([{ title: projectTitle, kind: 'project', workflow_stage: 'execute' }])
  await page.reload()

  await openQuickCapture(page)
  const dialog = page.getByRole('dialog', { name: 'Quick capture' })
  await dialog.getByLabel('Title').fill('Bank form #errands')
  await dialog.getByRole('button', { name: 'Add to Inbox' }).click()
  await expect(dialog).toBeHidden()

  await page.getByTestId('inbox-badge').click()
  const inboxSheet = page.getByTestId('inbox-sheet')
  await expect(inboxSheet.getByText('Bank form')).toBeVisible()
  await expect(inboxSheet.getByText('errands')).toBeVisible()

  await inboxSheet.getByRole('button', { name: 'File as task' }).click()
  await expect(page.getByText(/Filing/)).toBeVisible()
  await page.getByTestId('project-card').filter({ hasText: projectTitle }).click()

  await page.getByTestId('inbox-badge').click()
  await expect(page.getByTestId('inbox-sheet').getByText('Bank form')).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByTestId('project-card').filter({ hasText: projectTitle }).click()
  await expect(page.getByText('Bank form')).toBeVisible()
})
