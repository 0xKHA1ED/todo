import { expect, test, type Response } from '@playwright/test'
import { addProject, closePanel, panelEditor, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

function isParentWrite(response: Response) {
  if (response.request().method() !== 'PATCH') return false
  if (!response.url().includes('/rest/v1/nodes')) return false
  if (!response.ok()) return false
  return (response.request().postData() ?? '').includes('parent_id')
}

test('panel edits title, outcome, tags, and markdown content', async ({ page }) => {
  await signIn(page)
  const title = `Edited ${Date.now()}`
  await addProject(page, title)
  await expect(page.getByText(title).first()).toBeVisible()

  await page.getByLabel('Outcome').fill('Ship the migration')
  await page.getByLabel('Outcome').blur()
  await page.getByLabel('Tags').fill('e2e, playwright')
  await page.getByLabel('Tags').blur()
  await expect(page.getByText('playwright').first()).toBeVisible()

  await panelEditor(page).fill('Markdown content from Playwright')
  await page.keyboard.press('Escape')
  await page.getByTestId('project-card').filter({ hasText: title }).click()
  await page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true }).getByRole('button', { name: title }).click()
  await expect(panelEditor(page)).toContainText('Markdown content from Playwright')
})

test('project cards enter the place and breadcrumb opens details', async ({ page }) => {
  await signIn(page)
  const projectTitle = `Project ${Date.now()}`
  await seedNodeTree([
    { title: projectTitle, kind: 'project' },
    { title: `Child ${Date.now()}`, parentTitle: projectTitle, kind: 'module' },
  ])

  await page.reload()
  await page.getByTestId('project-card').filter({ hasText: projectTitle }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText(projectTitle)
  await expect(page.getByTestId('module-hub')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
  await page.getByTestId('project-card').filter({ hasText: projectTitle }).click()
  await page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true }).getByRole('button', { name: projectTitle }).click()
  await expect(page.getByLabel('Title')).toHaveValue(projectTitle)
  await closePanel(page)
})

test('panel move re-parents a subtree under any destination', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Project A', kind: 'project', workflow_stage: 'execute' },
    { title: 'Task A', parentTitle: 'Project A', kind: 'task' },
    { title: 'Project B', kind: 'project', workflow_stage: 'execute' },
  ])
  await page.reload()

  await page.getByTestId('project-card').filter({ hasText: 'Project A' }).click()
  await expect(page.getByText('Task A')).toBeVisible()
  await page.getByRole('button', { name: 'Task A' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Task A')
  await page.getByRole('button', { name: 'Move subtree' }).click()
  await page.getByPlaceholder('Search destinations...').fill('Project B')
  const parentSaved = page.waitForResponse(isParentWrite)
  await page.keyboard.press('Enter')
  await parentSaved

  await expect(page.getByRole('dialog').last().getByText('Inside Project B', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByTestId('project-card').filter({ hasText: 'Project B' }).click()
  await expect(page.getByText('Task A')).toBeVisible()
})
