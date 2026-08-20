import { expect, test, type Response } from '@playwright/test'
import { fitCanvas, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

function localISODate(daysFromToday: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isMissingLastVisitedColumn(error: unknown) {
  const text = typeof error === 'string' ? error : JSON.stringify(error)
  return text.includes('last_visited_at') && text.includes('PGRST204')
}

function isVisitNodesWrite(response: Response) {
  const method = response.request().method()
  if (method !== 'PATCH' && method !== 'POST') return false
  if (!response.url().includes('/rest/v1/nodes')) return false
  if (!response.ok()) return false
  return (response.request().postData() ?? '').includes('last_visited_at')
}

test('Now ranks overdue first with overflow', async ({ page }) => {
  const today = localISODate(0)
  const yesterday = localISODate(-1)

  await signIn(page)
  await seedNodeTree([
    { title: 'Pay bill', date: yesterday, urgency: 'high' },
    { title: 'Today task 1', date: today },
    { title: 'Today task 2', date: today },
    { title: 'Today task 3', date: today },
    { title: 'Today task 4', date: today },
    { title: 'Today task 5', date: today },
  ])
  await page.reload()

  const nowList = page.locator('section', { has: page.getByRole('heading', { name: 'Now' }) })
  await expect(nowList.getByRole('button').first()).toContainText('Pay bill')
  await expect(nowList.getByText('Overdue')).toBeVisible()
  await expect(nowList.getByText('Due today').first()).toBeVisible()
  await expect(nowList.getByText('1 more')).toBeVisible()
})

test('Forgotten opens a stale area and visit persists across reload', async ({ page }) => {
  await signIn(page)
  try {
    await seedNodeTree([
      { title: 'Design' },
      { title: 'Logo', parentTitle: 'Design' },
      { title: 'Work', last_visited_at: new Date().toISOString() },
      { title: 'Standup', parentTitle: 'Work' },
    ])
  } catch (error) {
    if (!isMissingLastVisitedColumn(error)) throw error
    test.skip(
      true,
      `BLOCKED: ${JSON.stringify(error)}`,
    )
  }

  await page.reload()
  const forgotten = page.getByRole('button', { name: 'Forgotten Design' })
  await expect(forgotten).toBeVisible()
  await page.waitForResponse(isVisitNodesWrite, { timeout: 5_000 }).catch(() => {})

  const designVisit = page.waitForResponse(isVisitNodesWrite)
  await forgotten.click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText('Design')
  await designVisit

  const homeEntered = page.waitForResponse(isVisitNodesWrite)
  await page.reload()
  await homeEntered
  await expect(page.getByRole('button', { name: 'Forgotten Work' })).toBeVisible()
})

test('Forgotten stays visible when all direct children were seen recently', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Newest', last_visited_at: new Date().toISOString() },
    { title: 'Older recent', last_visited_at: new Date(Date.now() - 60_000).toISOString() },
  ])

  await page.reload()
  await expect(page.getByRole('button', { name: 'Forgotten Older recent' })).toBeVisible()
})

test('loud dated leaves show due labels and undated compact leaves do not', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Fix faucet', date: localISODate(0) },
    { title: 'Paint' },
  ])
  await page.reload()
  await fitCanvas(page)

  const faucet = page.locator('.react-flow__node', { hasText: 'Fix faucet' })
  const paint = page.locator('.react-flow__node', { hasText: 'Paint' })
  await expect(faucet).toBeVisible()
  await expect(paint).toBeVisible()
  await expect(faucet).toContainText(/DUE TODAY|OVERDUE/)
  await expect(paint).not.toContainText('DUE TODAY')
  await expect(paint).not.toContainText('OVERDUE')
})
