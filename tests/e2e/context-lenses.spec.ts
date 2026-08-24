import { expect, test } from '@playwright/test'
import { requireE2ECredentials, requireSystemRoleMigration, seedNodeTree, signIn } from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireSystemRoleMigration()
})

test('Errands lens lists cross-project tagged leaves and opens the picked task in its parent place', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Life Admin' },
    { title: 'Bank run', parentTitle: 'Life Admin', tags: ['errands'] },
    { title: 'Home Repairs' },
    { title: 'Return package', parentTitle: 'Home Repairs', tags: ['errands'] },
    { title: 'Completed errand', parentTitle: 'Home Repairs', tags: ['errands'], completed: true },
    { title: 'Area tag', tags: ['errands'] },
    { title: 'Nested child', parentTitle: 'Area tag', tags: ['computer'] },
  ])
  await page.reload()

  await page.getByRole('button', { name: 'Errands' }).click()

  await expect(page.getByText('Errands across your life')).toBeVisible()
  await expect(page.getByRole('button', { name: /Bank run/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Return package/ })).toBeVisible()
  await expect(page.getByText('Completed errand')).toHaveCount(0)
  await expect(page.getByText('Area tag')).toHaveCount(0)

  await page.getByRole('button', { name: /Bank run/ }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Bank run')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText('Life Admin')
})