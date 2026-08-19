# Place-based Life Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-on full-life mindmap with a nested Place UI (Home / project / area) that shows Now, one Forgotten child, and hybrid-weighted direct children only.

**Architecture:** Pure functions in `src/lib/place/placeModel.ts` derive Now, Forgotten, visit targets, and card density from the existing node tree plus `last_visited_at`. The map page always stands in one `currentPlaceId` (the hidden root on load). React Flow renders only that place’s visible direct children. Focus mode, MiniMap, and the filter bar go away.

**Tech Stack:** Next.js 15 (static export), TypeScript, Zustand, React Flow, Dagre, Supabase, Vitest (new, for place-model unit tests), Playwright (existing E2E).

**Spec:** `docs/superpowers/specs/2026-08-18-place-based-life-map-design.md` Part 1.

**Do not implement Part 2 (auth recovery) in this plan.** That is `docs/superpowers/plans/2026-08-18-email-auth-recovery.md`.

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/003_add_last_visited_at.sql` | Add `nodes.last_visited_at` |
| `src/types/index.ts` | `last_visited_at`, `NodeDensity`, canvas `NodeData` extras |
| `src/lib/place/placeModel.ts` | Now, Forgotten, density, visit IDs |
| `src/lib/place/placeModel.test.ts` | Unit tests for that module |
| `vitest.config.ts` | Vitest + `@/` alias |
| `src/lib/store/useUIStore.ts` | `currentPlaceId`, `showDone`, `enterPlace` (replaces focus mode) |
| `src/lib/store/useNodeStore.ts` | `markVisited` |
| `src/lib/flow/treeLayout.ts` | Layout **direct children only**, size by density |
| `src/components/canvas/CustomNode.tsx` | Four densities; no % / tags / focus button |
| `src/components/canvas/MindmapCanvas.tsx` | Place-scoped graph; no MiniMap / line grid |
| `src/components/place/PlaceScreen.tsx` | Shell: breadcrumb, Now, Forgotten, toolbar, canvas, panel, palette |
| `src/components/place/PlaceBreadcrumb.tsx` | Home / … trail + Back |
| `src/components/place/NowList.tsx` | Capped Now list |
| `src/components/place/ForgottenCard.tsx` | One forgotten slot |
| `src/app/map/page.tsx` | Render `PlaceScreen`; reset place on mount |
| `src/hooks/useKeyboardNav.ts` | Add / Enter / Tab / Delete per spec |
| `src/components/palette/CommandPalette.tsx` | Jump to parent place |
| `src/hooks/useFilter.ts` | Delete (unused) |
| `src/components/filters/FilterBar.tsx` | Delete |
| `tests/e2e/helpers.ts` | Seed `date`, `completed`, `last_visited_at` |
| `tests/e2e/*.spec.ts` | Rewrite focus/filter/creation; add place specs |
| `.github/workflows/deploy.yml` | Run `npm test` (vitest) before e2e |
| `README.md` | Place UI, drop filter/focus docs |

---

### Task 1: Vitest harness

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add config and script**

`vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

In `package.json` scripts add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run vitest**

Run: `npm test`

Expected: PASS with `No test files found` or equivalent zero-test success (vitest 2+ prints “No test files found, exiting with code 1” — if exit code is 1, add a placeholder later in Task 3; do not leave a fake passing test). If it exits 1 for no tests, that is OK until Task 3 adds files.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for place-model unit tests"
```

---

### Task 2: `last_visited_at` schema and types

**Files:**
- Create: `supabase/migrations/003_add_last_visited_at.sql`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add migration**

```sql
ALTER TABLE public.nodes
ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ;
```

Apply this in the Supabase SQL editor on the project used for local/E2E before running Playwright against a real backend.

- [ ] **Step 2: Extend types**

In `src/types/index.ts`, add `last_visited_at: string | null` to `NodeRecord`.

Add to `UpdateNodePayload` Pick: `'last_visited_at'`.

Replace `NodeData` / add density types:

```ts
export type NodeDensity = 'loud' | 'medium' | 'area' | 'compact'

export type NodeData = NodeRecord &
  NodeProgressSummary & {
    density: NodeDensity
    insideCount: number
    dueCount: number
    staleDays: number | null
  } & Record<string, unknown>
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_add_last_visited_at.sql src/types/index.ts
git commit -m "feat: add last_visited_at to nodes"
```

---

### Task 3: `rankNow` (TDD)

**Files:**
- Create: `src/lib/place/placeModel.ts`
- Test: `src/lib/place/placeModel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { rankNow } from './placeModel'
import type { NodeRecord, Urgency } from '@/types'

function node(partial: Partial<NodeRecord> & Pick<NodeRecord, 'id' | 'title'>): NodeRecord {
  return {
    user_id: 'user',
    parent_id: 'home',
    completed: false,
    urgency: 'normal' as Urgency,
    date: null,
    tags: [],
    description: '',
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_visited_at: null,
    ...partial,
  }
}

const today = new Date(2026, 7, 18) // 18 Aug 2026 local

const home = node({ id: 'home', title: 'Main', parent_id: null })

describe('rankNow', () => {
  it('orders overdue, today, next 7 days, then high-with-no-date, and caps at 5', () => {
    const nodes = [
      home,
      node({ id: 'a', title: 'Overdue', date: '2026-08-10', sort_order: 1 }),
      node({ id: 'b', title: 'Today', date: '2026-08-18', sort_order: 2 }),
      node({ id: 'c', title: 'This week', date: '2026-08-21', sort_order: 3 }),
      node({ id: 'd', title: 'High undated', urgency: 'high', sort_order: 4 }),
      node({ id: 'e', title: 'Also overdue', date: '2026-08-01', sort_order: 5 }),
      node({ id: 'f', title: 'Second high', urgency: 'high', sort_order: 6 }),
      node({ id: 'g', title: 'Someday', sort_order: 7 }),
      node({ id: 'done', title: 'Done today', date: '2026-08-18', completed: true, sort_order: 8 }),
    ]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.title)).toEqual([
      'Also overdue',
      'Overdue',
      'Today',
      'This week',
      'High undated',
    ])
    expect(result.overflow).toBe(1)
  })

  it('does not include the place node itself', () => {
    const nodes = [home, node({ id: 'child', title: 'Child', date: '2026-08-18' })]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.id)).toEqual(['child'])
  })

  it('includes nested descendants of the current place', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'bill', title: 'Pay ads', parent_id: 'biz', date: '2026-08-18' }),
    ]
    const result = rankNow(nodes, 'home', today)
    expect(result.items.map((item) => item.title)).toEqual(['Pay ads'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/place/placeModel.test.ts`

Expected: FAIL — cannot find module `./placeModel` or `rankNow` is not exported.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/place/placeModel.ts`. Import `NodeDensity` from `@/types` (do not redeclare it). Include `getDirectChildren`, `getSubtreeIds`, `subtreeDescendants`, `daysUntil`, `rankNow` as specified in the spec (overdue < today, today, ≤7 days, high + no date last; skip completed; cap 5; exclude the place node). Use local-date parsing (`new Date(year, month - 1, day)`), not `Date.parse` on `YYYY-MM-DD`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/place/placeModel.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/place/placeModel.ts src/lib/place/placeModel.test.ts
git commit -m "feat: rank Now items by date pressure with a cap of 5"
```

---

### Task 4: `pickForgotten` (TDD)

**Files:**
- Modify: `src/lib/place/placeModel.ts`
- Modify: `src/lib/place/placeModel.test.ts`

- [ ] **Step 1: Write the failing tests** (append to the test file)

```ts
import { pickForgotten, STALE_MS } from './placeModel'

describe('pickForgotten', () => {
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('prefers the oldest stale area over a stale leaf', () => {
    const nodes = [
      home,
      node({
        id: 'design',
        title: 'Design',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
      node({ id: 'logo', title: 'Logo', parent_id: 'design' }),
      node({
        id: 'undated-leaf',
        title: 'Someday leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS * 3).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set())
    expect(picked?.title).toBe('Design')
  })

  it('resurfaces a stale leaf when no stale area exists, skipping Now items', () => {
    const nodes = [
      home,
      node({
        id: 'in-now',
        title: 'Due leaf',
        date: '2026-08-18',
        last_visited_at: new Date(now.getTime() - STALE_MS * 2).toISOString(),
      }),
      node({
        id: 'stale',
        title: 'Forgotten leaf',
        last_visited_at: new Date(now.getTime() - STALE_MS - 1000).toISOString(),
      }),
    ]
    const picked = pickForgotten(nodes, 'home', now, new Set(['in-now']))
    expect(picked?.title).toBe('Forgotten leaf')
  })

  it('returns null when nothing is stale', () => {
    const nodes = [
      home,
      node({ id: 'fresh', title: 'Fresh', last_visited_at: now.toISOString() }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())).toBeNull()
  })

  it('treats null last_visited_at as stale', () => {
    const nodes = [
      home,
      node({ id: 'area', title: 'Health' }),
      node({ id: 'gym', title: 'Gym', parent_id: 'area' }),
    ]
    expect(pickForgotten(nodes, 'home', now, new Set())?.title).toBe('Health')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/place/placeModel.test.ts`

Expected: FAIL — `pickForgotten` is not exported.

- [ ] **Step 3: Implement `STALE_MS`, `isArea`, `isStale`, `pickForgotten`**

Rules: direct children only; skip completed; prefer stale areas (has children); oldest `last_visited_at` (null = 0); else oldest stale leaf not in `nowItemIds`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/place/placeModel.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/place/placeModel.ts src/lib/place/placeModel.test.ts
git commit -m "feat: pick one stale Forgotten child per place"
```

---

### Task 5: `visibleChildren` densities (TDD)

**Files:**
- Modify: `src/lib/place/placeModel.ts`
- Modify: `src/lib/place/placeModel.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { visibleChildren } from './placeModel'

describe('visibleChildren', () => {
  const today = new Date(2026, 7, 18)
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('assigns loud, medium, area, and compact densities', () => {
    const nodes = [
      home,
      node({ id: 'faucet', title: 'Fix faucet', date: '2026-08-18' }),
      node({ id: 'plumber', title: 'Call plumber', date: '2026-08-21' }),
      node({ id: 'paint', title: 'Paint' }),
      node({ id: 'marketing', title: 'Marketing' }),
      node({ id: 'copy', title: 'Copy', parent_id: 'marketing' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    const byTitle = Object.fromEntries(views.map((view) => [view.node.title, view.density]))
    expect(byTitle['Fix faucet']).toBe('loud')
    expect(byTitle['Call plumber']).toBe('medium')
    expect(byTitle['Paint']).toBe('compact')
    expect(byTitle.Marketing).toBe('area')
    expect(views.find((view) => view.node.title === 'Marketing')?.insideCount).toBe(1)
  })

  it('treats a high-urgency undated leaf as medium', () => {
    const highNodes = [home, node({ id: 'h', title: 'Urgent idea', urgency: 'high' })]
    const views = visibleChildren(highNodes, 'home', false, today, now)
    expect(views[0]?.density).toBe('medium')
  })

  it('makes an area loud when a descendant is due today', () => {
    const nodes = [
      home,
      node({ id: 'fin', title: 'Finances' }),
      node({ id: 'bill', title: 'Invoice', parent_id: 'fin', date: '2026-08-18' }),
    ]
    const views = visibleChildren(nodes, 'home', false, today, now)
    expect(views[0]?.density).toBe('loud')
    expect(views[0]?.dueCount).toBe(1)
  })

  it('hides completed leaves and fully-completed areas unless showDone', () => {
    const nodes = [
      home,
      node({ id: 'done', title: 'Done', completed: true }),
      node({ id: 'area', title: 'Old' }),
      node({ id: 'child', title: 'Old child', parent_id: 'area', completed: true }),
    ]
    expect(visibleChildren(nodes, 'home', false, today, now).map((view) => view.node.title)).toEqual([])
    expect(visibleChildren(nodes, 'home', true, today, now).map((view) => view.node.title)).toEqual(['Done', 'Old'])
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/place/placeModel.test.ts`

Expected: FAIL — `visibleChildren` is not exported.

- [ ] **Step 3: Implement `visibleChildren`**

Density rules from the spec table. Completed nodes with `showDone` are `compact`. Loud/medium areas still set `insideCount` / `dueCount`. `dueCount` = incomplete descendants with `date` and `daysUntil <= 7`. `staleDays` = whole days since `last_visited_at`, or `null` if not stale; if stale and `last_visited_at` is null, use `-1` (never).

- [ ] **Step 4: Run tests**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/place/placeModel.ts src/lib/place/placeModel.test.ts
git commit -m "feat: derive hybrid card densities for a place"
```

---

### Task 6: `visitTargetIds` (TDD)

**Files:**
- Modify: `src/lib/place/placeModel.ts`
- Modify: `src/lib/place/placeModel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { visitTargetIds } from './placeModel'

describe('visitTargetIds', () => {
  it('includes the place and ancestors, not descendants', () => {
    const nodes = [
      home,
      node({ id: 'biz', title: 'Business' }),
      node({ id: 'design', title: 'Design', parent_id: 'biz' }),
      node({ id: 'logo', title: 'Logo', parent_id: 'design' }),
    ]
    expect(visitTargetIds(nodes, 'design')).toEqual(['design', 'biz', 'home'])
    expect(visitTargetIds(nodes, 'design')).not.toContain('logo')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Expected: FAIL — `visitTargetIds` is not exported.

- [ ] **Step 3: Implement**

Walk `parent_id` from the place to the root. Return `[placeId, ...ancestorIds]`.

- [ ] **Step 4: Run tests**

Expected: PASS (`npm test` also).

- [ ] **Step 5: Commit**

```bash
git add src/lib/place/placeModel.ts src/lib/place/placeModel.test.ts
git commit -m "feat: compute visit targets as place plus ancestors"
```

---

### Task 7: UI store — current place

**Files:**
- Modify: `src/lib/store/useUIStore.ts`
- Test: `src/hooks/useKeyboardNav.ts` and `src/components/canvas/MindmapCanvas.tsx` still import focus APIs — leave them compiling until Task 12 by keeping deprecated stubs **only if needed**. Prefer replacing names now and updating call sites in the same task if TypeScript fails.

Replace focus-mode fields with:

```ts
currentPlaceId: string | null
showDone: boolean
enterPlace: (id: string) => void
resetPlace: () => void
setShowDone: (show: boolean) => void
```

Remove: `focusedNodeId`, `enterFocusMode`, `exitFocusMode`.

```ts
enterPlace: (id) =>
  set((state) => ({
    currentPlaceId: id,
    selectedNodeId: state.currentPlaceId === id ? state.selectedNodeId : null,
    isPanelOpen: state.currentPlaceId === id ? state.isPanelOpen : false,
  })),
resetPlace: () => set({ currentPlaceId: null, showDone: false, selectedNodeId: null, isPanelOpen: false }),
setShowDone: (showDone) => set({ showDone }),
```

Update `MindmapCanvas.tsx` and `CanvasToolbar.tsx` and `useFilter.ts` in this task enough that `npm run lint` passes: temporarily make `useFilter` return all node ids (ignore focusedNodeId) OR delete focus UI now.

Minimum for compile: remove focus button usage from `CustomNode.tsx` and `Exit focus` from `CanvasToolbar.tsx`; make `useFilter` ignore `focusedNodeId` (always apply tag/urgency filters only). Full Place UI comes later.

- [ ] **Step 1: Change the store and fix compile errors from removed focus APIs**

- [ ] **Step 2: Run `npx tsc --noEmit`**

Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/store/useUIStore.ts src/components/canvas/CustomNode.tsx src/components/canvas/CanvasToolbar.tsx src/hooks/useFilter.ts
git commit -m "refactor: replace focus mode with currentPlaceId"
```

---

### Task 8: `markVisited` in the node store

**Files:**
- Modify: `src/lib/store/useNodeStore.ts`
- Modify: `src/lib/store/useUIStore.ts` — `enterPlace` should not call the node store (avoid cycles). Call `markVisited` from `PlaceScreen` in Task 11.

- [ ] **Step 1: Add `markVisited`**

```ts
async markVisited(placeId: string) {
  const ids = visitTargetIds(get().nodes, placeId)
  if (ids.length === 0) return
  const timestamp = new Date().toISOString()
  const previous = get().nodes
  set({
    nodes: get().nodes.map((node) => (ids.includes(node.id) ? { ...node, last_visited_at: timestamp } : node)),
  })
  try {
    await Promise.all(ids.map((id) => queries.updateNode(id, { last_visited_at: timestamp })))
  } catch (error) {
    set({ nodes: previous })
    throw error
  }
},
```

Import `visitTargetIds` from `@/lib/place/placeModel`.

- [ ] **Step 2: Run `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/store/useNodeStore.ts
git commit -m "feat: persist last_visited_at on a place and its ancestors"
```

---

### Task 9: Layout direct children by density

**Files:**
- Modify: `src/lib/flow/treeLayout.ts`

- [ ] **Step 1: Change `buildFlowGraph` signature**

```ts
export const DENSITY_SIZE = {
  loud: { width: 240, height: 92 },
  medium: { width: 200, height: 72 },
  area: { width: 200, height: 72 },
  compact: { width: 168, height: 40 },
} as const

export const NODE_SIZE = DENSITY_SIZE.loud

export function buildFlowGraph(
  dbNodes: NodeRecord[],
  placeId: string,
  showDone: boolean,
  today: Date = new Date(),
  now: Date = new Date(),
): { nodes: FlowNode[]; edges: FlowEdge[] }
```

Implementation:

1. `const views = visibleChildren(dbNodes, placeId, showDone, today, now)`
2. Keep `buildProgressLookup(dbNodes)` for panel-era percent fields (still attach to `data` so types satisfy `NodeProgressSummary`; cards will not display them).
3. Dagre: only `views` as nodes. **Do not add edges between them** (siblings of one place are not a parent-child graph). Isolated nodes, still laid out in one column/row: set `rankdir: 'TB'`, `nodesep`, `ranksep`. If dagre needs edges for layout, add a hidden dummy or position manually in a vertical stack:

```ts
let y = 0
const nodes: FlowNode[] = views.map((view) => {
  const size = DENSITY_SIZE[view.density]
  const flowNode: FlowNode = {
    id: view.node.id,
    type: 'customNode',
    position: { x: 0, y },
    data: {
      ...view.node,
      ...(progressLookup.get(view.node.id) ?? { totalSubtaskCount: 0, completedSubtaskCount: 0, completionPercent: view.node.completed ? 100 : 0 }),
      density: view.density,
      insideCount: view.insideCount,
      dueCount: view.dueCount,
      staleDays: view.staleDays,
    },
    style: { width: size.width, height: size.height },
  }
  y += size.height + 16
  return flowNode
})
return { nodes, edges: [] }
```

Use this manual stack (no sibling edges). Simpler than dummy dagre edges. YAGNI: no mindmap edges among siblings.

- [ ] **Step 2: Update `MindmapCanvas` call site** to pass `currentPlaceId` (use root fallback: first node with `parent_id === null`) so the app still compiles.

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/flow/treeLayout.ts src/components/canvas/MindmapCanvas.tsx
git commit -m "feat: layout only the current place direct children"
```

---

### Task 10: Density-aware `CustomNode`

**Files:**
- Modify: `src/components/canvas/CustomNode.tsx`
- Modify: `src/app/globals.css` (remove hover-lift if present)

- [ ] **Step 1: Rewrite the node**

Behavior:

- Root class: `mindmap-node` with **no** `shadow-md`, **no** `hover:-translate-y-0.5`, **no** progress bar, **no** tags, **no** percent, **no** focus button.
- Size from `DENSITY_SIZE[data.density]` (import from `treeLayout`).
- `loud`: 2px rose border, `DUE TODAY` / `OVERDUE` from `data.date` vs today (`daysUntil`).
- `medium`: 1px border, date via `formatDate` or `high`.
- `area` (including loud/medium areas): title + `{insideCount} inside` + optional `{dueCount} due` + optional `{staleDays}d` / `never` when `staleDays === -1`.
- `compact`: title only; line-through + muted if `completed`.
- Handles: keep but `opacity-0`.
- Click: do not `openPanel` inside the node for areas. Let the canvas decide (Task 12). Use a single button that calls `openPanel` only when `!isArea` where `isArea = data.insideCount > 0 ||` children exist. Prefer `insideCount > 0` OR check store children. **Use `data.insideCount > 0` as area.** Leaves call `openPanel(id)` on click.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/CustomNode.tsx src/app/globals.css
git commit -m "feat: render four node densities without noisy chrome"
```

---

### Task 11: Place chrome components

**Files:**
- Create: `src/components/place/PlaceBreadcrumb.tsx`
- Create: `src/components/place/NowList.tsx`
- Create: `src/components/place/ForgottenCard.tsx`
- Create: `src/components/place/PlaceScreen.tsx`
- Modify: `src/components/canvas/CanvasToolbar.tsx`

- [ ] **Step 1: Breadcrumb**

`nav aria-label="Breadcrumb"`. Trail: `Home` (root) then ancestor titles from `getAncestors(currentPlaceId)` plus current title **unless** current is root (show only Home). Each ancestor is a button calling `enterPlace(id)`. Include a `Back` button that `enterPlace(parent_id)` when `parent_id` is not null, disabled at Home.

- [ ] **Step 2: NowList**

Props: `items: NodeRecord[]`, `overflow: number`, `onPick(id: string)`. Each row: title + ancestor path label (parent title). Cap already applied. If `overflow > 0`, text `{overflow} more`. Empty: hide the section (render null).

- [ ] **Step 3: ForgottenCard**

If `node` is null, render null. Else dashed warning card, title, copy `Never opened` when `!last_visited_at`, else `Unseen for N days` using `staleDays` or computed days. Button/card click: `onOpen()`.

- [ ] **Step 4: Toolbar**

Remove node-count Network badge, Exit focus, filter coupling. Keep: Fit, Add, Sign out, loading/error. Add `Show done` toggle bound to `showDone` / `setShowDone`. **Add** creates `{ parent_id: currentPlaceId, title: 'New Task' }` then `requestTitleFocus`. If `currentPlaceId` is null, no-op.

- [ ] **Step 5: PlaceScreen**

Client component:

- On mount: `resetPlace()`.
- After `nodes` load: if `currentPlaceId` is null or missing, `enterPlace(root.id)`.
- `useEffect` on `currentPlaceId`: if set, `markVisited(currentPlaceId).catch` → retry once → toast `Could not save visit` only if still failing. Do **not** block rendering.
- Layout: `h-screen` grid. Left column `w-72` Now + Forgotten. Main: breadcrumb + toolbar overlay, `MindmapCanvas`. Empty children: overlay “Add a project” when place is root, else “Add a child”.
- Now pick: `enterPlace(item.parent_id!)`, `selectNode(item.id)` (no panel).
- Forgotten open: `enterPlace(forgotten.id)`.
- Includes `SlideOutPanel`, `CommandPalette`, `useKeyboardNav()`.

- [ ] **Step 6: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/place src/components/canvas/CanvasToolbar.tsx
git commit -m "feat: add Place chrome for Now, Forgotten, and breadcrumb"
```

---

### Task 12: Wire the map page; remove filter/minimap/focus leftovers

**Files:**
- Modify: `src/app/map/page.tsx`
- Modify: `src/components/canvas/MindmapCanvas.tsx`
- Delete: `src/components/filters/FilterBar.tsx`
- Delete: `src/hooks/useFilter.ts`
- Modify: `src/components/canvas/CustomEdge.tsx` — unused if no edges; keep file.
- Modify: `src/app/globals.css` — canvas background uses `--canvas`, no line grid class required.

- [ ] **Step 1: Map page**

`MapContent` returns `<PlaceScreen />` inside `ReactFlowProvider` (palette/canvas still need it). Remove FilterBar import.

- [ ] **Step 2: MindmapCanvas**

- `buildFlowGraph(dbNodes, currentPlaceId ?? root.id, showDone)`
- Remove MiniMap.
- Background: `BackgroundVariant.Dots` with very low opacity **or** no Background. Spec: no line grid. Use no `<Background>` or dots at 0.15 opacity.
- `fitView` when children change.
- `onNodeClick`: if `data.insideCount > 0`, `selectNode` only; else `openPanel`.
- `onNodeDoubleClick`: if `insideCount > 0`, `enterPlace(id)`.
- `handleNodeDragStop`: reparent only if target id is in the current visible child set and is not the dragged node; reject root; keep cycle check. Persist `position_x/y` as today (harmless).
- Do not `openPanel` on every `onNodeClick` in addition to CustomNode — pick **canvas handler only** and make CustomNode’s inner button `pointer-events-none` except we need clicks. Simplest: CustomNode is display-only (no openPanel); canvas handles click/dblclick.

Update CustomNode to be non-button display if canvas handles clicks.

- [ ] **Step 3: Delete FilterBar and useFilter; grep and remove imports**

- [ ] **Step 4: `npx tsc --noEmit` and `npm run lint`**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/map/page.tsx src/components/canvas/MindmapCanvas.tsx src/app/globals.css
git add -u src/components/filters src/hooks/useFilter.ts
git commit -m "feat: make the map a Place screen and drop the full-life forest UI"
```

---

### Task 13: Keyboard navigation

**Files:**
- Modify: `src/hooks/useKeyboardNav.ts`

- [ ] **Step 1: Replace Tab/Enter/Backspace behavior**

Keep Ctrl+K, Escape (close panel + clear selection), F2 (title focus), Delete with confirm for non-root.

Remove Backspace deletion (spec: Backspace unused on canvas).

```ts
const currentPlaceId = useUIStore.getState().currentPlaceId
const enterPlace = useUIStore.getState().enterPlace
const openPanel = useUIStore.getState().openPanel

if (event.key === 'Tab') {
  event.preventDefault()
  if (!selected) return
  const isArea = nodes.some((node) => node.parent_id === selected.id)
  if (!isArea) return
  const child = await createNode({ parent_id: selected.id, title: 'New Task' })
  enterPlace(selected.id)
  requestTitleFocus(child.id)
  return
}

if (event.key === 'Enter') {
  event.preventDefault()
  if (!selected) return
  const isArea = nodes.some((node) => node.parent_id === selected.id)
  if (isArea) enterPlace(selected.id)
  else openPanel(selected.id)
  return
}

if (event.key === 'Delete' && selected.parent_id !== null) {
  // existing confirm + deleteNode
  const parentId = selected.parent_id
  const standing = useUIStore.getState().currentPlaceId
  await deleteNode(selected.id)
  closePanel()
  if (standing === selected.id) enterPlace(parentId)
}
```

Subscribe to `currentPlaceId` in the effect deps.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useKeyboardNav.ts
git commit -m "feat: navigate places with Enter/Tab and delete with Delete only"
```

---

### Task 14: Command palette jump

**Files:**
- Modify: `src/components/palette/CommandPalette.tsx`

- [ ] **Step 1: Replace `setCenter` jump**

On select:

```ts
const hit = nodes.find((node) => node.id === nodeId)
toggleCommandPalette(false)
setQuery('')
if (!hit) return
if (hit.parent_id) {
  enterPlace(hit.parent_id)
  selectNode(hit.id)
  const isArea = nodes.some((node) => node.parent_id === hit.id)
  if (!isArea) openPanel(hit.id)
} else {
  enterPlace(hit.id)
}
```

Remove `useReactFlow` import (palette can live outside flow, but it is still inside the provider — removing the hook is fine).

Exclude the root from search results in `useCommandSearch` (`parent_id !== null`) so “Main” does not clutter.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/palette/CommandPalette.tsx src/hooks/useCommandSearch.ts
git commit -m "feat: command palette jumps into a node parent place"
```

---

### Task 15: Rewrite E2E helpers and broken specs

**Files:**
- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/e2e/node-creation.spec.ts`
- Modify: `tests/e2e/panel.spec.ts`
- Modify: `tests/e2e/command-palette.spec.ts`
- Modify: `tests/e2e/auth.spec.ts`
- Modify: `tests/e2e/completion-progress.spec.ts`
- Modify: `tests/e2e/drag-and-drop.spec.ts`
- Delete: `tests/e2e/filtering.spec.ts`
- Delete: `tests/e2e/focus-mode.spec.ts`

- [ ] **Step 1: Extend `seedNodeTree`**

Each seed item may include `date?: string | null`, `completed?: boolean`, `last_visited_at?: string | null`. Pass them through on insert.

- [ ] **Step 2: Rewrite `node-creation.spec.ts`**

After `signIn`:

- Expect breadcrumb `Home`.
- Expect `Main` **not** as a canvas node: `await expect(page.locator('.react-flow__node', { hasText: 'Main' })).toHaveCount(0)`.
- Click `Add`, expect title focused, fill `Child ${Date.now()}`, Escape, expect `.react-flow__node` count 1.

- [ ] **Step 3: Panel / command palette / drag**

`panel.spec.ts` and `command-palette.spec.ts`: click `Add` (not `selectFirstNode` on Main). Then edit/search as today.

`drag-and-drop.spec.ts`: Add twice (two Home children), drag as today; count starts from 0 nodes.

`auth.spec.ts` login success: `await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()` instead of `.react-flow` if the canvas is empty.

`completion-progress.spec.ts`: Add a child, mark completed in panel, expect it hidden on the canvas; click `Show done`; expect the node visible with strike or compact title. Remove any `%` / `1/1` assertions.

- [ ] **Step 4: Delete filtering and focus-mode specs**

- [ ] **Step 5: Run Playwright**

Run: `npm run test:e2e`

Expected: PASS for remaining specs. (Requires local Supabase migration `003` applied and E2E secrets.)

- [ ] **Step 6: Commit**

```bash
git add tests/e2e
git commit -m "test: align Playwright suites with Place navigation"
```

---

### Task 16: Place navigation, Now, Forgotten, densities E2E

**Files:**
- Create: `tests/e2e/place-navigation.spec.ts`
- Create: `tests/e2e/now-forgotten.spec.ts`

- [ ] **Step 1: Write `place-navigation.spec.ts`**

```ts
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
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Health')
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.getByLabel('Title').fill('Gym')
  await closePanel(page)
  await expect(page.locator('.react-flow__node', { hasText: 'Gym' })).toBeVisible()
})

test('deleting the current place returns to the parent', async ({ page }) => {
  await signIn(page)
  await seedNodeTree([{ title: 'Temp project' }])
  await page.reload()
  await fitCanvas(page)
  await page.locator('.react-flow__node', { hasText: 'Temp project' }).dblclick()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Temp project')
  await page.locator('.react-flow__node', { hasText: 'Temp project' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.keyboard.press('Delete')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Home')
})
```

Note: after entering Temp project, the current place **is** Temp project, so its node is not a visible child. Delete-current-place must work from breadcrumb context: select via Now or keep a handle. **Fix the test:** add a child `Temp child`, enter Temp project (child visible), then we need to delete the **place** itself. Provide a overflow menu? Spec says deleting the node you are standing in stands you in its parent. Add a **Delete place** control? YAGNI: select the place via breadcrumb current label: clicking the current crumb selects `currentPlaceId` (not enter). Then Delete.

Update `PlaceBreadcrumb`: the **current** crumb is a button that `selectNode(currentPlaceId)` so Delete can remove it.

Include that breadcrumb select in Task 11 if missed; do it here if not.

- [ ] **Step 2: Write `now-forgotten.spec.ts`**

Seed under Home:

- `Pay bill` date yesterday, urgency high
- Five more dated-today tasks so overflow appears
- Area `Design` with child `Logo`, `last_visited_at` null
- Fresh area `Work` with `last_visited_at` = now (via seed)

Expect Now first row `Pay bill`. Expect Forgotten `Design`. Click Forgotten → breadcrumb contains Design. Reload (always Home). Forgotten should still be Design until that visit persisted — after click, reload: Design should **not** be Forgotten if visit wrote; next stale leaf/area appears or slot hides.

For densities: seed `Fix faucet` date=today at Home; expect the node to contain `DUE TODAY` or `OVERDUE`. Seed `Paint` undated; expect no `DUE TODAY` on that card.

- [ ] **Step 3: Ctrl+K in this file or extend command-palette spec**

Create `Deep` under `Art Business`, search `Deep`, expect breadcrumb `Art Business` and panel title `Deep`.

- [ ] **Step 4: Run `npm run test:e2e`**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/place-navigation.spec.ts tests/e2e/now-forgotten.spec.ts src/components/place/PlaceBreadcrumb.tsx
git commit -m "test: cover place drill-down, Now, Forgotten, and Tab-to-enter"
```

---

### Task 17: CI vitest + README

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] **Step 1: Workflow**

After `npm run lint` and before e2e:

```yaml
- run: npm test
```

- [ ] **Step 2: README**

Replace “infinite node nesting on one canvas”, urgency color-coded on every card, visual filtering, focus mode. Describe Place: Home, Now (max 5), Forgotten (14 days), hybrid densities, Add, Show done, Ctrl+K. Document applying `003_add_last_visited_at.sql`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "docs: describe Place UI and run unit tests in CI"
```

---

## Task 11 / 16 breadcrumb select (do not skip)

Current crumb must call `selectNode(currentPlaceId)` so Delete can remove the place you are standing in. Back still goes to `parent_id`. Home crumb calls `enterPlace(root.id)`.
