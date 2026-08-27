import { expect, test, type Page } from '@playwright/test'
import {
  addDomain,
  addProject,
  captureToInbox,
  closePanel,
  goHome,
  nameNewNode,
  openQuickCapture,
  requireE2ECredentials,
  requireLifePmMigration,
  signIn,
  typeUnderHeading,
} from './helpers'

test.beforeEach(async () => {
  requireE2ECredentials()
  await requireLifePmMigration()
})

async function completeProblemByTyping(page: Page) {
  await expect(page.getByTestId('stage-document').locator('h2', { hasText: 'Problem statement' })).toBeVisible()
  await typeUnderHeading(page, 'Problem statement', 'Sessions drop during checkout.')
  await typeUnderHeading(page, 'Who', 'Mobile shoppers.')
  await typeUnderHeading(page, 'Pain', 'Carts are abandoned.')
  await typeUnderHeading(page, 'Why now', 'Ticket spike this week.')
  await typeUnderHeading(page, 'Constraints', 'Ship before the freeze.')
  await typeUnderHeading(page, 'Not solving', 'Native apps')
  await page.keyboard.press('Enter')
  await page.keyboard.type('OAuth migration', { delay: 10 })
  await expect(page.getByTestId('sign-off')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('sign-off').click()
}

function sessionExport(stage: string, sections: Record<string, string>, checklist: string[]) {
  const body = [
    '## Summary',
    'Dogfood notes for this stage.',
    ...Object.entries(sections).flatMap(([title, content]) => ['', `## ${title}`, '', content]),
    '',
    '## Locked decisions',
    '',
    '- 2026-08-27 — Keep the simple path for v1',
    '',
    '## Open questions',
    '',
    '- (none)',
    '',
    '## Stage checklist',
    '',
    ...checklist.map((label) => `- [x] ${label}`),
    '',
  ].join('\n')

  return `---
life_pm_format: "1.0"
type: session_export
module_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
module: Flooring
project: Flooring
domain: Home
stage: ${stage}
status: complete
session_date: 2026-08-27
sign_off: true
summary: Dogfood notes for this stage.
---

${body}
`
}

async function importStage(page: Page, markdown: string) {
  await page.getByTestId('import-session').click()
  const dialog = page.getByRole('dialog', { name: 'Import session MD' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Markdown').fill(markdown)
  await expect(page.getByTestId('import-session-submit')).toBeEnabled()
  await page.getByTestId('import-session-submit').click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })
}

test('a real user can add, edit, and delete domains, projects, modules, and tasks', async ({ page }) => {
  await signIn(page)

  await addDomain(page, 'IMS')
  await page.getByTestId('domain-group').filter({ hasText: 'IMS' }).getByTestId('add-domain-project').click()
  await nameNewNode(page, 'Platform rewrite')
  await expect(page.getByTestId('project-card').filter({ hasText: 'Platform rewrite' })).toBeVisible()

  await page.getByTestId('domain-header').filter({ hasText: 'IMS' }).click()
  await expect(page.getByTestId('module-hub')).toBeVisible()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Platform rewrite' })).toBeVisible()

  await page.getByTestId('hub-card').filter({ hasText: 'Platform rewrite' }).click()
  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await page.getByTestId('add-module').click()
  await nameNewNode(page, 'Auth')
  await expect(page.getByTestId('module-hub')).toBeVisible()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Auth' })).toBeVisible()

  await page.getByTestId('hub-card').filter({ hasText: 'Auth' }).click()
  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await page.getByTestId('add-module').click()
  await nameNewNode(page, 'Token refresh')
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Token refresh' })).toBeVisible()
  await page.getByTestId('hub-card').filter({ hasText: 'Token refresh' }).click()
  await expect(page.getByTestId('place-title')).toHaveText('Token refresh')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Token refresh')

  await page.getByTestId('place-details').click()
  await page.getByLabel('Outcome').fill('Sessions survive backgrounding')
  await page.getByLabel('Outcome').blur()
  await page.getByRole('button', { name: 'paused', exact: true }).click()
  await closePanel(page)
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: /Auth/ }).click()

  await page.getByTestId('hub-card').filter({ hasText: 'Token refresh' }).getByTestId('place-delete').click()
  await page.getByTestId('confirm-delete').click()
  await expect(page.getByTestId('hub-card').filter({ hasText: 'Token refresh' })).toHaveCount(0)

  await goHome(page)
  const imsGroup = page.getByTestId('domain-group').filter({ hasText: 'IMS' })
  await imsGroup.getByTestId('place-delete').first().click()
  await page.getByTestId('confirm-delete').click()
  await expect(page.getByTestId('domain-header').filter({ hasText: 'IMS' })).toHaveCount(0)
})

test('a leaf project can be completed end to end from the UI', async ({ page }) => {
  test.setTimeout(90_000)
  await signIn(page)
  await addProject(page, 'Flooring')
  await closePanel(page)
  await page.getByTestId('project-card').filter({ hasText: 'Flooring' }).click()
  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await expect(page.getByTestId('stage-document').locator('h2', { hasText: 'Who' })).toBeVisible()

  await completeProblemByTyping(page)
  await expect(page.getByTestId('sign-off')).toContainText('Ready for Plan')

  await importStage(
    page,
    sessionExport(
      'shape',
      {
        Options: '- Glue down\n- Floating click\n- Do nothing',
        Tradeoffs: 'Glue is durable; click is faster; doing nothing leaves a trip hazard.',
        Killed: '- Do nothing: the floor is already failing',
        'Chosen direction': 'Floating click lock in the living room first.',
      },
      ['Options (min 3)', 'Tradeoffs', 'Killed', 'Chosen direction', 'Sign-off'],
    ),
  )
  await expect(page.getByTestId('sign-off')).toBeEnabled()
  await page.getByTestId('sign-off').click()
  await expect(page.getByTestId('sign-off')).toContainText('Ready for Spec')

  await importStage(
    page,
    sessionExport(
      'plan',
      {
        Approach: 'Clear the room, acclimate planks, install from the longest wall.',
        Phases: '- Prep\n- Install\n- Trim',
        Dependencies: 'Furniture must move first.',
        Risks: '- Subfloor moisture — meter before install',
        'Non-goals': 'Do not refinish the hallway this month.',
      },
      ['Approach', 'Phases', 'Dependencies', 'Risks', 'Non-goals', 'Sign-off'],
    ),
  )
  await expect(page.getByTestId('sign-off')).toBeEnabled()
  await page.getByTestId('sign-off').click()
  await expect(page.getByTestId('sign-off')).toContainText('Ready for Execute')

  await importStage(
    page,
    sessionExport(
      'spec',
      {
        Requirements: '- Even click-lock surface with no lippage',
        'Acceptance criteria': '1. No trip edges\n2. Color match the sample\n3. Baseboards reinstalled',
        'Edge cases': '- Door will not close\n- Vent cut is tight',
        'Verification plan': 'Walk the room and check every doorway.',
      },
      ['Requirements', 'Acceptance criteria (min 3)', 'Edge cases (min 2)', 'Verification plan', 'Sign-off'],
    ),
  )
  await expect(page.getByTestId('sign-off')).toBeEnabled()
  await page.getByTestId('sign-off').click()

  await expect(page.getByTestId('execute-list')).toBeVisible()
  await expect(page.getByTestId('add-work-item')).toBeEnabled()
  await page.getByTestId('add-work-item').click()
  await nameNewNode(page, 'Acclimate planks')
  await page.getByTestId('add-work-item').click()
  await nameNewNode(page, 'Install first row')
  await page.getByRole('checkbox', { name: 'Complete Acclimate planks' }).check()
  await page.getByRole('checkbox', { name: 'Complete Install first row' }).check()

  await page.getByRole('button', { name: 'Overview' }).click()
  await expect(page.getByTestId('sign-off')).toBeEnabled()
  await page.getByTestId('sign-off').click()
  await expect(page.getByTestId('sign-off')).toContainText('Close')

  await importStage(
    page,
    sessionExport(
      'review',
      {
        'Problem revisited': 'Yes — the trip hazard is gone.',
        Surprises: 'Door clearance needed extra undercut.',
        Learnings: 'Acclimate a full day longer next time.',
      },
      ['Problem revisited', 'Surprises', 'Learnings', 'Sign-off'],
    ),
  )
  await expect(page.getByTestId('sign-off')).toBeEnabled()
  await page.getByTestId('sign-off').click()

  await goHome(page)
  await page.getByRole('button', { name: /Done \/ Archived/ }).click()
  await expect(page.getByTestId('project-card').filter({ hasText: 'Flooring' })).toBeVisible()
})

test('inbox capture, filing, and promote all work from the portfolio', async ({ page }) => {
  await signIn(page)
  await addProject(page, 'Errands project')
  await closePanel(page)
  await page.getByTestId('project-card').filter({ hasText: 'Errands project' }).click()
  await page.getByRole('button', { name: 'Emergency: skip to Execute…' }).click()
  await page.getByLabel('Reason').fill('Need a place to file errands today')
  await page.getByRole('button', { name: 'Skip to Execute' }).click()
  await expect(page.getByTestId('execute-list')).toBeVisible()
  await goHome(page)

  await captureToInbox(page, 'Bank form #errands')
  await page.getByTestId('inbox-badge').click()
  await page.getByRole('button', { name: 'File as task' }).click()
  await expect(page.getByText(/Filing/)).toBeVisible()
  await page.getByTestId('project-card').filter({ hasText: 'Errands project' }).click()
  await expect(page.getByText(/Filing/)).toHaveCount(0)

  await page.getByTestId('project-card').filter({ hasText: 'Errands project' }).click()
  await expect(page.getByText('Bank form')).toBeVisible()
  await goHome(page)

  await captureToInbox(page, 'Silent session drop')
  await page.getByTestId('inbox-badge').click()
  await page.getByTestId('promote-to-project').click()
  await page.getByTestId('promote-submit').click()
  await expect(page.getByTestId('module-dashboard')).toBeVisible()
  await expect(page.getByTestId('place-title')).toHaveText('Silent session drop')
  await expect(page.getByTestId('stage-document')).toContainText('Silent session drop')
})

test('quick capture, search, map, and lenses stay reachable', async ({ page }) => {
  await signIn(page)
  await addProject(page, 'Searchable project')
  await closePanel(page)

  await openQuickCapture(page)
  await page.keyboard.press('Escape')

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  await page.getByPlaceholder('Search titles and descriptions...').fill('Searchable project')
  await expect(page.getByRole('option', { name: /Searchable project/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('place-title')).toHaveText('Searchable project')

  await page.getByRole('button', { name: 'Map' }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
  await goHome(page)

  await page.getByRole('button', { name: 'Errands' }).click()
  await expect(page.getByText('Errands across your life')).toBeVisible()
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Home' }).click()
  await expect(page.getByTestId('portfolio-dashboard')).toBeVisible()
})
