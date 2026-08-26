import { expect, test } from '@playwright/test'
import { requireE2ECredentials, requireLifePmMigration, seedNodeTree, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireLifePmMigration()
})

test('/map shows a project card grid instead of the canvas', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Auth refactor', kind: 'project', outcome: 'Migrate auth without downtime', workflow_stage: 'shape' },
    {
      title: 'Token refresh',
      parentTitle: 'Auth refactor',
      kind: 'module',
      health: 'blocked',
      workflow_stage: 'problem',
    },
  ])
  await page.reload()

  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  const card = page.getByTestId('project-card').filter({ hasText: 'Auth refactor' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Token refresh')).toBeVisible()
  await expect(card.getByText('Active')).toBeVisible()

  await card.click()
  await expect(page.getByTestId('module-hub')).toBeVisible()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Token refresh' })).toBeVisible()
})

test('Inbox and C work from the portfolio', async ({ page }) => {
  await signIn(page)
  await page.keyboard.press('c')
  await expect(page.getByRole('dialog', { name: 'Quick capture' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByTestId('inbox-badge').click()
  await expect(page.getByRole('dialog').last().getByText('Inbox')).toBeVisible()
})
