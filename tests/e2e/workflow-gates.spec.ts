import { expect, test } from '@playwright/test'
import { requireE2ECredentials, requireLifePmMigration, seedNodeTree, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireLifePmMigration()
})

test('cannot add a work item before Execute and can after', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([{ title: 'Token refresh', kind: 'project', workflow_stage: 'problem' }])
  await page.reload()
  await page.getByTestId('project-card').filter({ hasText: 'Token refresh' }).click()
  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await page.getByRole('button', { name: 'List' }).click()
  await expect(page.getByTestId('add-work-item')).toBeDisabled()

  await page.getByRole('button', { name: 'Overview' }).click()
  await page.getByRole('button', { name: 'Emergency: skip to Execute…' }).click()
  await page.getByLabel('Reason').fill('Production auth outage')
  await page.getByRole('button', { name: 'Skip to Execute' }).click()
  await expect(page.getByText('Emergency skip used')).toBeVisible()
  await page.getByRole('button', { name: 'List' }).click()
  await expect(page.getByTestId('add-work-item')).toBeEnabled()
  await page.getByTestId('add-work-item').click()
  await expect(page.getByLabel('Title')).toBeFocused()
})

test('inbox promote creates a project at problem with seed text', async ({ page }) => {
  await signIn(page)
  await page.keyboard.press('c')
  const capture = page.getByRole('dialog', { name: 'Quick capture' })
  await capture.getByLabel('Title').fill('Silent session drop')
  await capture.getByRole('button', { name: 'Add to Inbox' }).click()

  await page.getByTestId('inbox-badge').click()
  await page.getByTestId('promote-to-project').click()
  await page.getByTestId('promote-submit').click()

  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Silent session drop' })).toBeVisible()
  await expect(page.getByTestId('stage-document')).toContainText('Silent session drop')
})
