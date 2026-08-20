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

async function readFlowPosition(locator: Locator) {
  return locator.evaluate((element) => {
    const transform = (element as HTMLElement).style.transform
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform)
    if (!match) return null

    return {
      x: Number(match[1]),
      y: Number(match[2]),
    }
  })
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
  const dragDistanceY = Math.max(160, sourceBox!.height + 80)

  const positionSaved = page.waitForResponse(isPositionWrite)
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2 + dragDistanceY, {
    steps: 12,
  })
  await page.mouse.up()
  await positionSaved

  const movedPosition = await readFlowPosition(source)
  test.skip(!movedPosition, 'Moved node position was unavailable.')

  await expect
    .poll(async () => (await readFlowPosition(source))?.y ?? 0)
    .toBeGreaterThan(80)

  await page.reload()
  await fitCanvas(page)

  const reloadedSource = page.locator('.react-flow__node', { hasText: 'Source Area' })
  const reloadedTarget = page.locator('.react-flow__node', { hasText: 'Target Area' })
  await expect(reloadedSource).toBeVisible()
  await expect(reloadedTarget).toBeVisible()

  await expect
    .poll(async () => {
      const currentSource = await readFlowPosition(reloadedSource)
      if (!currentSource) return Number.MAX_SAFE_INTEGER
      return Math.max(
        Math.abs(currentSource.x - movedPosition!.x),
        Math.abs(currentSource.y - movedPosition!.y),
      )
    })
    .toBeLessThan(1)
})
