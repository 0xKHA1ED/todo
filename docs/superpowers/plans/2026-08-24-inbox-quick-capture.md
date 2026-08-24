# Inbox + Quick Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system Inbox under Home, a global Ctrl+Shift+N quick-capture dialog, and an Inbox list on the Home sidebar for triage.

**Architecture:** `system_role = 'inbox'` on one node per user, ensured in `fetchAllNodes`. `quickCapture.ts` parses `#tags` from titles. `InboxList` surfaces incomplete Inbox children at Home; File reuses extracted move-target logic.

**Tech Stack:** Next.js 15, Supabase migration `004`, Zustand, Shadcn Dialog, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-life-os-enhancements-design.md` Part 2.

**Depends on:** Nothing from other enhancement plans (can ship after or before checklists).

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/004_add_system_role.sql` | `system_role` column + unique inbox index |
| `src/types/index.ts` | `system_role` on `NodeRecord` |
| `src/lib/inbox/inboxModel.ts` | `getInboxId`, `listInboxItems`, guards |
| `src/lib/inbox/quickCapture.ts` | `parseQuickCaptureTitle` |
| `src/lib/inbox/inboxModel.test.ts` | Unit tests |
| `src/lib/inbox/quickCapture.test.ts` | Unit tests |
| `src/lib/store/useNodeStore.ts` | Ensure Inbox, delete/reparent guards |
| `src/lib/supabase/queries.ts` | Pass `system_role` on create |
| `src/components/capture/QuickCaptureDialog.tsx` | Modal UI |
| `src/components/place/InboxList.tsx` | Home sidebar Inbox section |
| `src/components/panel/MoveNodeDialog.tsx` | Shared move picker (extracted) |
| `src/components/panel/NodeDetailForm.tsx` | Use `MoveNodeDialog` |
| `src/components/place/PlaceScreen.tsx` | Inbox list + dialog |
| `src/hooks/useKeyboardNav.ts` | Ctrl+Shift+N |
| `tests/e2e/inbox-capture.spec.ts` | E2E |
| `README.md` | Inbox + shortcut docs |

---

### Task 1: Schema and types

**Files:**
- Create: `supabase/migrations/004_add_system_role.sql`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Migration**

```sql
ALTER TABLE public.nodes
ADD COLUMN IF NOT EXISTS system_role TEXT
  CHECK (system_role IS NULL OR system_role = 'inbox');

CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_user_inbox
  ON public.nodes (user_id)
  WHERE system_role = 'inbox';
```

Apply in Supabase SQL editor before E2E.

- [ ] **Step 2: Types**

Add to `NodeRecord`:

```ts
system_role: 'inbox' | null
```

Add to `CreateNodePayload` and `UpdateNodePayload` picks as optional `system_role`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_add_system_role.sql src/types/index.ts
git commit -m "feat: add system_role column for Inbox node"
```

---

### Task 2: `parseQuickCaptureTitle` (TDD)

**Files:**
- Create: `src/lib/inbox/quickCapture.ts`
- Test: `src/lib/inbox/quickCapture.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseQuickCaptureTitle } from './quickCapture'

describe('parseQuickCaptureTitle', () => {
  it('strips hash tags from the title', () => {
    expect(parseQuickCaptureTitle('Bank form #errands #paperwork')).toEqual({
      title: 'Bank form',
      tags: ['errands', 'paperwork'],
    })
  })

  it('returns the full string when no tags', () => {
    expect(parseQuickCaptureTitle('  Call dentist  ')).toEqual({
      title: 'Call dentist',
      tags: [],
    })
  })

  it('deduplicates tags case-insensitively', () => {
    expect(parseQuickCaptureTitle('Task #Errands #errands')).toEqual({
      title: 'Task',
      tags: ['Errands'],
    })
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/inbox/quickCapture.test.ts`

- [ ] **Step 3: Implement**

```ts
export function parseQuickCaptureTitle(raw: string): { title: string; tags: string[] } {
  const tokens = raw.trim().split(/\s+/)
  const tags: string[] = []
  const titleParts: string[] = []

  for (const token of tokens) {
    if (token.startsWith('#') && token.length > 1) {
      const tag = token.slice(1)
      if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
        tags.push(tag)
      }
    } else {
      titleParts.push(token)
    }
  }

  const title = titleParts.join(' ').trim()
  return { title: title || 'New Task', tags }
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/inbox/quickCapture.ts src/lib/inbox/quickCapture.test.ts
git commit -m "feat: parse hash tags from quick capture titles"
```

---

### Task 3: Inbox model (TDD)

**Files:**
- Create: `src/lib/inbox/inboxModel.ts`
- Test: `src/lib/inbox/inboxModel.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { getInboxId, listInboxItems, INBOX_LIST_CAP } from './inboxModel'
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

describe('inboxModel', () => {
  const home = node({ id: 'home', title: 'Main', parent_id: null })
  const inbox = node({ id: 'inbox', title: 'Inbox', parent_id: 'home', system_role: 'inbox', sort_order: -1 })

  it('finds inbox id', () => {
    expect(getInboxId([home, inbox])).toBe('inbox')
  })

  it('lists incomplete inbox children oldest first capped at INBOX_LIST_CAP', () => {
    const children = Array.from({ length: INBOX_LIST_CAP + 2 }, (_, index) =>
      node({
        id: `c${index}`,
        title: `Item ${index}`,
        parent_id: 'inbox',
        created_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    )
    const result = listInboxItems([home, inbox, ...children], 'inbox')
    expect(result.items).toHaveLength(INBOX_LIST_CAP)
    expect(result.overflow).toBe(2)
    expect(result.items[0]?.title).toBe('Item 0')
  })
})
```

- [ ] **Step 2: Run to verify fail**

- [ ] **Step 3: Implement**

```ts
import type { NodeRecord } from '@/types'

export const INBOX_LIST_CAP = 8

export function getInboxId(nodes: NodeRecord[]): string | null {
  return nodes.find((node) => node.system_role === 'inbox')?.id ?? null
}

export function listInboxItems(nodes: NodeRecord[], inboxId: string) {
  const items = nodes
    .filter((node) => node.parent_id === inboxId && !node.completed)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.sort_order - b.sort_order)

  return {
    items: items.slice(0, INBOX_LIST_CAP),
    overflow: Math.max(0, items.length - INBOX_LIST_CAP),
  }
}

export function isSystemNode(node: NodeRecord): boolean {
  return node.parent_id === null || node.system_role === 'inbox'
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/inbox/inboxModel.ts src/lib/inbox/inboxModel.test.ts
git commit -m "feat: add inbox listing helpers"
```

---

### Task 4: Ensure Inbox on fetch + guards

**Files:**
- Modify: `src/lib/store/useNodeStore.ts`
- Modify: `src/lib/supabase/queries.ts`

- [ ] **Step 1: queries.createNode accepts `system_role`**

Ensure the insert type and spread include optional `system_role`.

- [ ] **Step 2: After root creation in `fetchAllNodes`**

```ts
if (!nodes.some((node) => node.system_role === 'inbox')) {
  const root = nodes.find((node) => node.parent_id === null)
  if (root) {
    const inbox = await queries.createNode({
      user_id: userId,
      parent_id: root.id,
      title: 'Inbox',
      urgency: 'normal',
      tags: [],
      description: defaultEditorContent(),
      sort_order: -1,
      system_role: 'inbox',
    })
    nodes = [...nodes, inbox]
  }
}
```

- [ ] **Step 3: Guards in `deleteNode` and `reparentNode`**

```ts
if (selected.system_role === 'inbox') throw new Error('The Inbox cannot be deleted.')
// reparentNode:
if (selected.system_role === 'inbox') throw new Error('The Inbox cannot be moved.')
```

- [ ] **Step 4: Add `captureToInbox(title: string)`**

```ts
async captureToInbox(rawTitle: string) {
  const inboxId = getInboxId(get().nodes)
  if (!inboxId) throw new Error('Inbox is not available.')
  const { title, tags } = parseQuickCaptureTitle(rawTitle)
  return get().createNode({ parent_id: inboxId, title, tags })
},
```

Import `getInboxId` and `parseQuickCaptureTitle`.

- [ ] **Step 5: `npx tsc --noEmit` — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/store/useNodeStore.ts src/lib/supabase/queries.ts
git commit -m "feat: auto-create Inbox and support quick capture"
```

---

### Task 5: Quick capture dialog

**Files:**
- Create: `src/components/capture/QuickCaptureDialog.tsx`
- Modify: `src/lib/store/useUIStore.ts`
- Modify: `src/components/place/PlaceScreen.tsx`

- [ ] **Step 1: UI store flags**

```ts
isQuickCaptureOpen: boolean
toggleQuickCapture: (open?: boolean) => void
```

Default `false`. Toggle like command palette.

- [ ] **Step 2: Dialog component**

Shadcn `Dialog` with:
- `open` / `onOpenChange` from store
- Single `Input` autofocus, placeholder `What’s on your mind? #errands`
- Submit on Enter calls `captureToInbox`, toast `Captured`, close, clear field
- Disabled submit when trimmed empty

- [ ] **Step 3: Mount in PlaceScreen**

`<QuickCaptureDialog />` next to `CommandPalette`.

- [ ] **Step 4: Commit**

```bash
git add src/components/capture/QuickCaptureDialog.tsx src/lib/store/useUIStore.ts src/components/place/PlaceScreen.tsx
git commit -m "feat: add quick capture dialog"
```

---

### Task 6: Ctrl+Shift+N shortcut

**Files:**
- Modify: `src/hooks/useKeyboardNav.ts`

- [ ] **Step 1: Add handler before other shortcuts**

```ts
if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
  event.preventDefault()
  useUIStore.getState().toggleQuickCapture(true)
  return
}
```

Extend `shouldIgnoreShortcut` to also skip when quick capture dialog input is focused (dialog input is an `input`, already covered).

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useKeyboardNav.ts
git commit -m "feat: bind Ctrl+Shift+N to quick capture"
```

---

### Task 7: InboxList + MoveNodeDialog

**Files:**
- Create: `src/components/place/InboxList.tsx`
- Create: `src/lib/panel/moveTargets.ts`
- Create: `src/components/panel/MoveNodeDialog.tsx`
- Modify: `src/components/panel/NodeDetailForm.tsx`
- Modify: `src/components/place/PlaceScreen.tsx`

- [ ] **Step 1: Extract `buildMoveTargets(nodeId, nodes)`**

Move the `moveTargets` useMemo logic from `NodeDetailForm` into `src/lib/panel/moveTargets.ts` and export it.

- [ ] **Step 2: `MoveNodeDialog`**

Props: `nodeId`, `open`, `onOpenChange`, `onMoved?`. Uses `buildMoveTargets` + `reparentNode`.

- [ ] **Step 3: Refactor NodeDetailForm** to use `MoveNodeDialog`.

- [ ] **Step 4: `InboxList`**

Props: `items`, `overflow`, `onFile(id)`, `onOpenInbox()`, `onPick(id)` for row click → open panel.

Render section like `NowList` with heading **Inbox**. Each row has **File** button setting local state `fileNodeId` and opening `MoveNodeDialog`.

- [ ] **Step 5: PlaceScreen at Home**

```ts
const inboxId = getInboxId(nodes)
const isRootPlace = ...
const inboxItems = isRootPlace && inboxId ? listInboxItems(nodes, inboxId) : { items: [], overflow: 0 }
```

Render `<InboxList />` above `<NowList />` when `inboxItems.items.length > 0`.

`onOpenInbox`: `enterPlace(inboxId)`.

- [ ] **Step 6: Commit**

```bash
git add src/components/place/InboxList.tsx src/lib/panel/moveTargets.ts src/components/panel/MoveNodeDialog.tsx src/components/panel/NodeDetailForm.tsx src/components/place/PlaceScreen.tsx
git commit -m "feat: show Inbox on Home with File triage"
```

---

### Task 8: E2E + README

**Files:**
- Create: `tests/e2e/inbox-capture.spec.ts`
- Modify: `tests/e2e/helpers.ts` — seed may include `system_role`
- Modify: `README.md`

- [ ] **Step 1: E2E test**

```ts
test('quick capture adds to Inbox and File moves it to a project', async ({ page }) => {
  await signIn(page)
  await page.keyboard.press('Control+Shift+N')
  await page.getByPlaceholder(/mind/i).fill('Bank errand #errands')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Bank errand' })).toBeVisible()
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Title').fill('Finances')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'File' }).first().click()
  await page.getByText('Finances').click()
  await expect(page.getByRole('button', { name: 'Bank errand' })).toHaveCount(0)
  await page.locator('.react-flow__node', { hasText: 'Finances' }).dblclick()
  await expect(page.locator('.react-flow__node', { hasText: 'Bank errand' })).toBeVisible()
})
```

- [ ] **Step 2: README** — document Inbox, Ctrl+Shift+N, `#tags`, migration `004`.

- [ ] **Step 3: Run `npm test` and `npm run test:e2e tests/e2e/inbox-capture.spec.ts`**

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/inbox-capture.spec.ts tests/e2e/helpers.ts README.md
git commit -m "test: cover inbox capture and triage; document Inbox"
```
