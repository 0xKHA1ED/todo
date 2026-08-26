import { expect, test } from '@playwright/test'
import { closePanel, openMapTab, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('completed children hide until Show done reveals them', async ({ page }) => {
  await signIn(page)
  const title = `Completed ${Date.now()}`
  await seedNodeTree([
    { title: 'Arena', kind: 'project', workflow_stage: 'execute' },
    { title, parentTitle: 'Arena', kind: 'task', completed: true },
  ])
  await page.reload()
  await page.getByTestId('project-card').filter({ hasText: 'Arena' }).click()
  await openMapTab(page)

  await expect(page.locator('.react-flow__node', { hasText: title })).toHaveCount(0)

  const showDone = page.getByRole('button', { name: 'Show done' })
  await showDone.click()
  await expect(showDone).toHaveAttribute('aria-pressed', 'true')

  const doneNode = page.locator('.react-flow__node', { hasText: title })
  await expect(doneNode).toBeVisible()
  await expect(doneNode.locator('.mindmap-node-title')).toHaveClass(/line-through|truncate/)
  await closePanel(page).catch(() => undefined)
})
