# Context Lenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At Home, let the user enter one of four context lenses (Errands, At computer, Calls, At home) that list incomplete leaf tasks across the entire tree matching a tag.

**Architecture:** Pure functions in `src/lib/place/contextLenses.ts` define lenses and `rankLensItems`. `useUIStore.activeLensId` toggles lens mode. `LensPicker` + `LensList` replace the sidebar ritual sections and hide the children canvas while active.

**Tech Stack:** TypeScript, Vitest, Playwright, existing place navigation.

**Spec:** `docs/superpowers/specs/2026-08-24-life-os-enhancements-design.md` Part 3.

**Depends on:** Tags on nodes (existing). Works best after Inbox quick capture (`#errands`) but has no hard dependency.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/place/contextLenses.ts` | Lens defs + `rankLensItems` |
| `src/lib/place/contextLenses.test.ts` | Unit tests |
| `src/lib/store/useUIStore.ts` | `activeLensId`, clear on leave Home |
| `src/components/place/LensPicker.tsx` | Four lens toggle buttons |
| `src/components/place/LensList.tsx` | Ranked cross-tree list |
| `src/components/place/PlaceBreadcrumb.tsx` | Show lens label after Home |
| `src/components/place/PlaceScreen.tsx` | Wire lens mode |
| `src/hooks/useKeyboardNav.ts` | Escape clears lens |
| `tests/e2e/context-lenses.spec.ts` | E2E |
| `README.md` | Document four context tags |

---

### Task 1: `rankLensItems` (TDD)

**Files:**
- Create: `src/lib/place/contextLenses.ts`
- Test: `src/lib/place/contextLenses.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { CONTEXT_LENSES, getLensById, rankLensItems, LENS_ITEM_CAP } from './contextLenses'
import type { NodeRecord } from '@/types'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'u',
    parent_id: 'home',
    completed: false,
    urgency: 'normal',
    date: null,
    tags: [],
    description: '',
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    system_role: null,
    ...partial,
  }
}

const today = new Date(2026, 7, 24)

describe('contextLenses', () => {
  const home = node({ id: 'home', title: 'Main', parent_id: null })

  it('exports four lenses', () => {
    expect(CONTEXT_LENSES).toHaveLength(4)
    expect(getLensById('errands')?.tag).toBe('errands')
  })

  it('includes only incomplete leaves with matching tag anywhere under root', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'bank', title: 'Bank', parent_id: 'biz', tags: ['errands'], date: '2026-08-24' }),
      node({ id: 'area', title: 'Errands area', tags: ['errands'] }),
      node({ id: 'child', title: 'Under area', parent_id: 'area', tags: ['errands'] }),
      node({ id: 'done', title: 'Done errand', tags: ['errands'], completed: true }),
      node({ id: 'other', title: 'Email', tags: ['computer'] }),
    ]
    const result = rankLensItems(nodes, 'home', 'errands', today)
    expect(result.items.map((item) => item.node.title)).toEqual(['Bank', 'Under area'])
    expect(result.items.find((item) => item.node.title === 'Errands area')).toBeUndefined()
  })

  it('matches tags case-insensitively', () => {
    const nodes = [home, node({ id: 'a', title: 'A', tags: ['Errands'] })]
    expect(rankLensItems(nodes, 'home', 'errands', today).items).toHaveLength(1)
  })

  it('caps results and reports overflow', () => {
    const leaves = Array.from({ length: LENS_ITEM_CAP + 3 }, (_, i) =>
      node({ id: `l${i}`, title: `E${i}`, tags: ['errands'], sort_order: i }),
    )
    const result = rankLensItems([home, ...leaves], 'home', 'errands', today)
    expect(result.items).toHaveLength(LENS_ITEM_CAP)
    expect(result.overflow).toBe(3)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/place/contextLenses.test.ts`

- [ ] **Step 3: Implement**

```ts
import type { NodeRecord } from '@/types'
import { daysUntil, type RankedNowItem, type NowBucket } from './placeModel'

export const LENS_ITEM_CAP = 20

export type ContextLens = {
  id: string
  label: string
  tag: string
}

export const CONTEXT_LENSES: ContextLens[] = [
  { id: 'errands', label: 'Errands', tag: 'errands' },
  { id: 'computer', label: 'At computer', tag: 'computer' },
  { id: 'calls', label: 'Calls', tag: 'calls' },
  { id: 'home', label: 'At home', tag: 'home' },
]

export function getLensById(id: string): ContextLens | undefined {
  return CONTEXT_LENSES.find((lens) => lens.id === id)
}

function isLeaf(nodes: NodeRecord[], nodeId: string): boolean {
  return !nodes.some((node) => node.parent_id === nodeId)
}

function nodeHasTag(node: NodeRecord, tag: string): boolean {
  const needle = tag.toLowerCase()
  return node.tags.some((candidate) => candidate.toLowerCase() === needle)
}

function bucketFor(node: NodeRecord, today: Date): { bucket: NowBucket; daysUntil: number | null } {
  const delta = daysUntil(node.date, today)
  if (delta !== null && delta < 0) return { bucket: 'overdue', daysUntil: delta }
  if (delta === 0) return { bucket: 'today', daysUntil: 0 }
  if (delta !== null && delta <= 7) return { bucket: 'soon', daysUntil: delta }
  if (node.urgency === 'high' && !node.date) return { bucket: 'high', daysUntil: null }
  return { bucket: 'high', daysUntil: null }
}

function compareLensItems(a: RankedNowItem, b: RankedNowItem): number {
  const order: Record<NowBucket, number> = { overdue: 0, today: 1, soon: 2, high: 3 }
  const bucketDelta = order[a.bucket] - order[b.bucket]
  if (bucketDelta !== 0) return bucketDelta
  const dayDelta = (a.daysUntil ?? Number.MAX_SAFE_INTEGER) - (b.daysUntil ?? Number.MAX_SAFE_INTEGER)
  if (dayDelta !== 0) return dayDelta
  return a.node.sort_order - b.node.sort_order || a.node.created_at.localeCompare(b.node.created_at)
}

export function rankLensItems(nodes: NodeRecord[], rootId: string, lensId: string, today: Date) {
  const lens = getLensById(lensId)
  if (!lens) return { items: [] as RankedNowItem[], overflow: 0 }

  const ranked: RankedNowItem[] = []
  for (const node of nodes) {
    if (node.id === rootId) continue
    if (node.completed) continue
    if (!isLeaf(nodes, node.id)) continue
    if (!nodeHasTag(node, lens.tag)) continue
    const { bucket, daysUntil: delta } = bucketFor(node, today)
    ranked.push({ node, bucket, daysUntil: delta })
  }

  ranked.sort(compareLensItems)
  return {
    items: ranked.slice(0, LENS_ITEM_CAP),
    overflow: Math.max(0, ranked.length - LENS_ITEM_CAP),
  }
}
```

Export `RankedNowItem` type reuse from `placeModel` — if `bucketFor` for undated normal urgency should rank last, add a fifth bucket or push undated normal to end:

Adjust ranking: undated non-high leaves sort after high. In `bucketFor`, return `{ bucket: 'soon', daysUntil: 999 }` only for dated soon; for undated normal/low use sort tie-breaker:

Simpler fix in compare: after bucket compare, if both `high` bucket, compare urgency rank.

Update test expectation if needed.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/place/contextLenses.ts src/lib/place/contextLenses.test.ts
git commit -m "feat: rank cross-tree items for context lenses"
```

---

### Task 2: UI store lens state

**Files:**
- Modify: `src/lib/store/useUIStore.ts`

- [ ] **Step 1: Add state**

```ts
activeLensId: string | null
setActiveLensId: (id: string | null) => void
```

- [ ] **Step 2: Clear lens when leaving root**

```ts
enterPlace: (id) =>
  set((state) => {
    const rootId = /* cannot access nodes here */
    return {
      currentPlaceId: id,
      activeLensId: state.activeLensId, // cleared in PlaceScreen when place is not root
      ...
    }
  }),
```

Better: clear in `PlaceScreen` effect when `currentPlaceId` changes and place is not root:

```ts
useEffect(() => {
  if (!isRootPlace && activeLensId) setActiveLensId(null)
}, [currentPlaceId, isRootPlace, activeLensId, setActiveLensId])
```

- [ ] **Step 3: `resetPlace` clears lens**

```ts
resetPlace: () => set({ ..., activeLensId: null })
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/store/useUIStore.ts
git commit -m "feat: add activeLensId to UI store"
```

---

### Task 3: LensPicker and LensList components

**Files:**
- Create: `src/components/place/LensPicker.tsx`
- Create: `src/components/place/LensList.tsx`

- [ ] **Step 1: LensPicker**

Row of four `Button`s with `aria-pressed`. Click toggles: if same id active → `setActiveLensId(null)`, else `setActiveLensId(id)`.

Only rendered when `isRootPlace`.

- [ ] **Step 2: LensList**

Reuse priority styling from `NowList` (copy `priorityCopy` / `priorityClasses` or extract shared `priorityUi.ts`).

Props: `items: RankedNowItem[]`, `overflow`, `lensLabel`, `onPick(id)`.

Empty state: `No open tasks tagged {tag}. Add #{tag} in tags or quick capture.`

Show parent path like NowList.

- [ ] **Step 3: Commit**

```bash
git add src/components/place/LensPicker.tsx src/components/place/LensList.tsx
git commit -m "feat: add lens picker and list components"
```

---

### Task 4: Wire PlaceScreen and breadcrumb

**Files:**
- Modify: `src/components/place/PlaceScreen.tsx`
- Modify: `src/components/place/PlaceBreadcrumb.tsx`

- [ ] **Step 1: PlaceScreen layout**

When `isRootPlace && activeLensId`:
- Sidebar: `LensPicker` at top, then `LensList` only (hide Inbox, Now, Forgotten).
- Main: hide `MindmapCanvas` (CSS `hidden` or conditional render). Show centered muted header: `{lens.label} across your life`.

When `isRootPlace && !activeLensId`:
- Show `LensPicker` below breadcrumb overlay (in main column top stack) OR in sidebar above Inbox.
- Spec: picker below breadcrumb on Home. Add to the overlay stack in main column next to breadcrumb.

When not root: no picker.

`handleLensPick`: same as command palette leaf jump — parent place, select, open panel.

```ts
function handleLensPick(id: string) {
  const item = nodes.find((node) => node.id === id)
  if (!item?.parent_id) return
  enterPlace(item.parent_id)
  selectNode(item.id)
  openPanel(item.id)
}
```

- [ ] **Step 2: Breadcrumb**

When `activeLensId` and at root, append non-clickable segment: `Home / {lens.label}`.

- [ ] **Step 3: Commit**

```bash
git add src/components/place/PlaceScreen.tsx src/components/place/PlaceBreadcrumb.tsx
git commit -m "feat: wire context lens mode at Home"
```

---

### Task 5: Escape clears lens

**Files:**
- Modify: `src/hooks/useKeyboardNav.ts`

- [ ] **Step 1: On Escape**

```ts
if (event.key === 'Escape') {
  const { isPanelOpen, activeLensId, setActiveLensId, closePanel } = useUIStore.getState()
  if (isPanelOpen) {
    closePanel()
    useUIStore.getState().selectNode(null)
    return
  }
  if (activeLensId) {
    setActiveLensId(null)
    return
  }
  ...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useKeyboardNav.ts
git commit -m "feat: Escape exits an active context lens"
```

---

### Task 6: E2E tests

**Files:**
- Create: `tests/e2e/context-lenses.spec.ts`
- Modify: `tests/e2e/helpers.ts` — allow `tags` on seed items

- [ ] **Step 1: Extend seed helper**

`seedNodeTree` items accept `tags?: string[]`.

- [ ] **Step 2: Write spec**

```ts
import { expect, test } from '@playwright/test'
import { requireE2ECredentials, seedNodeTree, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('errands lens lists cross-project leaves and opens the picked task', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([
    { title: 'Finances' },
    { title: 'Bank form', parentTitle: 'Finances', tags: ['errands'] },
    { title: 'Health' },
    { title: 'Pharmacy', parentTitle: 'Health', tags: ['errands'], date: '2026-08-24' },
  ])
  await page.reload()

  await page.getByRole('button', { name: 'Errands' }).click()
  await expect(page.getByRole('button', { name: 'Pharmacy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bank form' })).toBeVisible()

  await page.getByRole('button', { name: 'Bank form' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Bank form')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Finances')
})
```

Use stable date: seed relative to “today” in helper or mock — prefer seeding `date` as today’s ISO date in the test via `new Date().toISOString().slice(0, 10)`.

- [ ] **Step 3: Run E2E**

Run: `npm run test:e2e tests/e2e/context-lenses.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/context-lenses.spec.ts tests/e2e/helpers.ts
git commit -m "test: cover errands context lens"
```

---

### Task 7: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document lenses**

Under Features:

- **Context lenses** — At Home, toggle Errands / At computer / Calls / At home to see open leaf tasks tagged `errands`, `computer`, `calls`, or `home` anywhere in your tree. Escape exits the lens.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: describe context lenses and tag names"
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
|---|---|
| Four fixed lenses | Task 1, 3 |
| Leaf-only, tag match | Task 1 |
| Cap 20 + overflow | Task 1 |
| Hide canvas in lens mode | Task 4 |
| Breadcrumb Home / Lens | Task 4 |
| Escape exits lens | Task 5 |
| Pick → parent + panel | Task 4 |
| E2E | Task 6 |
