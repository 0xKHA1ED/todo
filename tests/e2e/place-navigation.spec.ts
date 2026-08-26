import { expect, test } from '@playwright/test'
import { closePanel, goHome, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('shows only direct children and breadcrumb enters a nested module', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Art Business', kind: 'project' },
    { title: 'Marketing', parentTitle: 'Art Business', kind: 'module' },
    { title: 'Copy', parentTitle: 'Marketing', kind: 'module' },
    { title: 'Finances', parentTitle: 'Art Business', kind: 'module' },
  ])
  await page.reload()

  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.getByTestId('project-card').filter({ hasText: 'Art Business' })).toBeVisible()
  await expect(page.getByTestId('hub-card')).toHaveCount(0)

  await page.getByTestId('project-card').filter({ hasText: 'Art Business' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Art Business')
  await expect(page.getByTestId('module-hub')).toBeVisible()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Marketing' })).toBeVisible()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Copy' })).toHaveCount(0)

  await page.getByTestId('hub-card').filter({ hasText: 'Marketing' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Marketing')
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Copy' })).toBeVisible()

  await goHome(page)
  await expect(page.getByTestId('project-card').filter({ hasText: 'Art Business' })).toBeVisible()
})

test('Add work item in Execute creates a child of the current place', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([{ title: 'Health', kind: 'project', workflow_stage: 'execute' }])
  await page.reload()
  await page.getByTestId('project-card').filter({ hasText: 'Health' }).click()
  await page.getByTestId('add-work-item').click()
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.getByLabel('Title').fill('Gym')
  await page.getByLabel('Title').blur()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
  await closePanel(page)
  await expect(page.getByText('Gym')).toBeVisible()
})

test('deleting the current place returns to the parent', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Temp project', kind: 'project' },
    { title: 'Temp child', parentTitle: 'Temp project', kind: 'module' },
  ])
  await page.reload()
  await page.getByTestId('project-card').filter({ hasText: 'Temp project' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Temp project')
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Temp project' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.keyboard.press('Delete')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
})

test('ctrl+k jumps into the parent place of a nested node', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Art Business', kind: 'project' },
    { title: 'Deep', parentTitle: 'Art Business', kind: 'module' },
  ])
  await page.reload()
  await expect(page.getByTestId('project-card').filter({ hasText: 'Art Business' })).toBeVisible()

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const search = page.getByPlaceholder('Search titles and descriptions...')
  if (!(await search.isVisible().catch(() => false))) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    })
  }
  await search.fill('Deep')
  await expect(page.getByRole('option', { name: /Deep/ })).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText('Art Business')
})
