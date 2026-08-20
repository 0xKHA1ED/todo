import { expect, test, type Response } from '@playwright/test'
import { closePanel, fitCanvas, requireE2ECredentials, seedNodeTree, selectFirstNode, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

function isParentWrite(response: Response) {
  if (response.request().method() !== 'PATCH') return false
  if (!response.url().includes('/rest/v1/nodes')) return false
  if (!response.ok()) return false
  return (response.request().postData() ?? '').includes('parent_id')
}

test('panel edits title, urgency, date, tags, and markdown content', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Add a project')).toBeVisible()
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByLabel('Title')).toBeFocused()

  const title = `Edited ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Title').blur()
  await expect(page.getByText(title).first()).toBeVisible()

  await page.getByRole('button', { name: 'high' }).click()
  await page.getByLabel('Date badge').fill('2026-05-04')
  await page.getByLabel('Tags').fill('e2e, playwright')
  await page.getByLabel('Tags').blur()
  await expect(page.getByText('playwright').first()).toBeVisible()

  await page.locator('.tiptap').fill('Markdown content from Playwright')
  await page.keyboard.press('Escape')
  await selectFirstNode(page)
  await expect(page.locator('.tiptap')).toContainText('Markdown content from Playwright')
})

test('area nodes open details from the canvas and breadcrumb', async ({ page }) => {
  await signIn(page)
  const projectTitle = `Project ${Date.now()}`
  await seedNodeTree([
    { title: projectTitle },
    { title: `Child ${Date.now()}`, parentTitle: projectTitle },
  ])

  await page.reload()
  await fitCanvas(page)
  const projectNode = page.locator('.react-flow__node', { hasText: projectTitle })
  await expect(projectNode).toBeVisible()
  await projectNode.dblclick()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText(projectTitle)

  await page.getByRole('button', { name: 'Back' }).click()
  await fitCanvas(page)
  await expect(page.getByRole('button', { name: `Open details for ${projectTitle}` })).toBeVisible()
  await page.getByRole('button', { name: `Open details for ${projectTitle}` }).click()
  await expect(page.getByLabel('Title')).toHaveValue(projectTitle)
  await closePanel(page)

  await projectNode.dblclick()
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })
  await breadcrumb.getByRole('button', { name: projectTitle }).click()
  await expect(page.getByLabel('Title')).toHaveValue(projectTitle)
})

test('panel move re-parents a subtree under any destination', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Project A' },
    { title: 'Task A', parentTitle: 'Project A' },
    { title: 'Project B' },
  ])
  await page.reload()
  await fitCanvas(page)

  const source = page.locator('.react-flow__node', { hasText: 'Project A' })
  await expect(source).toBeVisible()

  await page.getByRole('button', { name: 'Open details for Project A' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Project A')
  await page.getByRole('button', { name: 'Move subtree' }).click()
  await page.getByPlaceholder('Search destinations...').fill('Project B')
  const parentSaved = page.waitForResponse(isParentWrite)
  await page.keyboard.press('Enter')
  await parentSaved

  await expect(page.getByRole('dialog').last().getByText('Inside Project B', { exact: true })).toBeVisible()
  await page.reload()
  await fitCanvas(page)

  const projectB = page.locator('.react-flow__node', { hasText: 'Project B' })
  await expect(projectB).toBeVisible()
  await projectB.dblclick()

  const movedArea = page.locator('.react-flow__node', { hasText: 'Project A' })
  await expect(movedArea).toBeVisible()
  await movedArea.dblclick()
  await expect(page.locator('.react-flow__node', { hasText: 'Task A' })).toBeVisible()
})
