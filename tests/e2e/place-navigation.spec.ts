import { expect, test } from '@playwright/test'
import { closePanel, fitCanvas, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('shows only direct children and breadcrumb enters a nested area', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Art Business' },
    { title: 'Marketing', parentTitle: 'Art Business' },
    { title: 'Copy', parentTitle: 'Marketing' },
    { title: 'Finances', parentTitle: 'Art Business' },
  ])
  await page.reload()

  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
  await expect(page.locator('.react-flow__node', { hasText: 'Art Business' })).toBeVisible()
  await expect(page.locator('.react-flow__node', { hasText: 'Marketing' })).toHaveCount(0)
  await expect(page.locator('.react-flow__node', { hasText: 'Copy' })).toHaveCount(0)

  await fitCanvas(page)
  await page.locator('.react-flow__node', { hasText: 'Art Business' }).dblclick()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Art Business')
  await expect(page.locator('.react-flow__node', { hasText: 'Marketing' })).toBeVisible()
  await expect(page.locator('.react-flow__node', { hasText: 'Copy' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.locator('.react-flow__node', { hasText: 'Art Business' })).toBeVisible()
})

test('Tab on an area creates a child and stands in that area', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([{ title: 'Health' }])
  await page.reload()
  await fitCanvas(page)
  await page.locator('.react-flow__node', { hasText: 'Health' }).click()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Title')).toBeFocused()
  // The slide-out sheet aria-hides the canvas, so include hidden breadcrumb nodes.
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText('Health')
  await page.getByLabel('Title').fill('Gym')
  await page.getByLabel('Title').blur()
  await expect(page.getByRole('heading', { name: 'Gym' })).toBeVisible()
  await closePanel(page)
  await expect(page.locator('.react-flow__node', { hasText: 'Gym' })).toBeVisible()
})

test('deleting the current place returns to the parent', async ({ page }) => {
  await signIn(page)
  // A child makes Temp project an area so dblclick enters without opening the leaf panel.
  await seedNodeTree([{ title: 'Temp project' }, { title: 'Temp child', parentTitle: 'Temp project' }])
  await page.reload()
  await fitCanvas(page)
  await page.locator('.react-flow__node', { hasText: 'Temp project' }).dblclick()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Temp project')
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Temp project' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.keyboard.press('Delete')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
})

test('ctrl+k jumps into the parent place of a nested node', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([{ title: 'Art Business' }, { title: 'Deep', parentTitle: 'Art Business' }])
  await page.reload()
  await expect(page.locator('.react-flow__node', { hasText: 'Art Business' })).toBeVisible()
  await fitCanvas(page)
  await page.locator('.react-flow__node', { hasText: 'Art Business' }).click()

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

  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText(
    'Art Business',
  )
  await expect(page.getByRole('heading', { name: 'Deep' })).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Deep')
})
