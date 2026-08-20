import { expect, test, type Locator, type Response } from '@playwright/test'
import { fitCanvas, requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

function isPositionWrite(response: Response) {
  if (response.request().method() !== 'PATCH') return false
  if (!response.url().includes('/rest/v1/nodes')) return false
  if (!response.ok()) return false
  const body = response.request().postData() ?? ''
  return body.includes('position_x') || body.includes('position_y')
}

async function waitForStableNode(locator: Locator) {
  let previous = await locator.boundingBox()
  await expect
    .poll(
      async () => {
        const current = await locator.boundingBox()
        if (!current || !previous) {
          previous = current
          return false
        }

        const stable = Math.abs(current.x - previous.x) < 0.5 && Math.abs(current.y - previous.y) < 0.5
        previous = current
        return stable
      },
      { intervals: [450, 450], timeout: 5_000 },
    )
    .toBe(true)
}

test('dragging a card moves it and the position survives reload', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Source Area' },
    { title: 'Source Child', parentTitle: 'Source Area' },
    { title: 'Target Area' },
  ])
  await page.reload()
  await fitCanvas(page)

  const source = page.locator('.react-flow__node', { hasText: 'Source Area' })
  const target = page.locator('.react-flow__node', { hasText: 'Target Area' })
  await expect(source).toBeVisible()
  await expect(target).toBeVisible()
  await waitForStableNode(source)
  await waitForStableNode(target)
  await source.click()
  await expect(source).toHaveClass(/selected/)

  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  test.skip(!sourceBox || !targetBox, 'Node boxes were unavailable.')

  const positionSaved = page.waitForResponse(isPositionWrite)
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2 + 220, sourceBox!.y + sourceBox!.height / 2, { steps: 12 })
  await page.mouse.up()
  await positionSaved

  await expect
    .poll(async () => (await source.boundingBox())?.x ?? 0)
    .toBeGreaterThan((targetBox?.x ?? 0) + 100)

  await page.reload()
  await fitCanvas(page)

  const reloadedSource = page.locator('.react-flow__node', { hasText: 'Source Area' })
  const reloadedTarget = page.locator('.react-flow__node', { hasText: 'Target Area' })
  await expect(reloadedSource).toBeVisible()
  await expect(reloadedTarget).toBeVisible()

  await expect
    .poll(async () => {
      const currentSource = await reloadedSource.boundingBox()
      const currentTarget = await reloadedTarget.boundingBox()
      return (currentSource?.x ?? 0) - (currentTarget?.x ?? 0)
    })
    .toBeGreaterThan(100)
})
