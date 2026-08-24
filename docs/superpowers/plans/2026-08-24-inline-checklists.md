# Inline Checklists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TipTap task lists usable in node descriptions with toolbar, styling, step progress in the panel, and auto-complete when all steps are checked.

**Architecture:** Pure functions in `src/lib/editor/checklistProgress.ts` parse TipTap JSON. `buildProgressLookup` merges checklist counts with child-node counts. `EditorToolbar` + input rules make checklists discoverable. `MarkdownEditor` applies auto-complete on debounced save.

**Tech Stack:** TipTap 2 (`@tiptap/extension-task-list`, `@tiptap/extension-task-item`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-life-os-enhancements-design.md` Part 1.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/editor/checklistProgress.ts` | Parse checklist totals from TipTap JSON |
| `src/lib/editor/checklistProgress.test.ts` | Unit tests |
| `src/lib/editor/extensions.ts` | TaskItem input rule for `- [ ]` |
| `src/lib/flow/treeLayout.ts` | Merge checklist progress in `buildProgressLookup` |
| `src/lib/flow/treeLayout.test.ts` | Progress merge tests |
| `src/components/panel/EditorToolbar.tsx` | Checklist toggle button |
| `src/components/panel/MarkdownEditor.tsx` | Toolbar, auto-complete on save |
| `src/components/panel/NodeDetailForm.tsx` | Show `N/M steps` label |
| `src/app/globals.css` | Task list checkbox styles |
| `tests/e2e/checklists.spec.ts` | E2E checklist flow |
| `README.md` | Document checklist shortcuts |

---

### Task 1: `parseChecklistProgress` (TDD)

**Files:**
- Create: `src/lib/editor/checklistProgress.ts`
- Test: `src/lib/editor/checklistProgress.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseChecklistProgress } from './checklistProgress'

const emptyDoc = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })

const checklistDoc = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Also open' }] }] },
      ],
    },
  ],
})

describe('parseChecklistProgress', () => {
  it('returns zeros for empty or invalid content', () => {
    expect(parseChecklistProgress('')).toEqual({ total: 0, completed: 0 })
    expect(parseChecklistProgress(emptyDoc)).toEqual({ total: 0, completed: 0 })
    expect(parseChecklistProgress('not json')).toEqual({ total: 0, completed: 0 })
  })

  it('counts task items in nested task lists', () => {
    expect(parseChecklistProgress(checklistDoc)).toEqual({ total: 3, completed: 1 })
  })

  it('counts multiple task lists in one document', () => {
    const doc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
          ],
        },
      ],
    })
    expect(parseChecklistProgress(doc)).toEqual({ total: 2, completed: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/editor/checklistProgress.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/editor/checklistProgress.ts`:

```ts
export type ChecklistProgress = { total: number; completed: number }

type TipTapNode = {
  type?: string
  attrs?: { checked?: boolean }
  content?: TipTapNode[]
}

export function parseChecklistProgress(description: string | null | undefined): ChecklistProgress {
  if (!description) return { total: 0, completed: 0 }

  let doc: TipTapNode
  try {
    doc = JSON.parse(description) as TipTapNode
  } catch {
    return { total: 0, completed: 0 }
  }

  let total = 0
  let completed = 0

  function walk(node: TipTapNode | undefined) {
    if (!node) return
    if (node.type === 'taskItem') {
      total += 1
      if (node.attrs?.checked) completed += 1
    }
    for (const child of node.content ?? []) walk(child)
  }

  walk(doc)
  return { total, completed }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/editor/checklistProgress.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/checklistProgress.ts src/lib/editor/checklistProgress.test.ts
git commit -m "feat: parse checklist progress from TipTap description JSON"
```

---

### Task 2: Merge checklist progress in `buildProgressLookup`

**Files:**
- Modify: `src/lib/flow/treeLayout.ts`
- Create: `src/lib/flow/treeLayout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildProgressLookup } from './treeLayout'
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

const checklistDescription = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph' }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
      ],
    },
  ],
})

describe('buildProgressLookup', () => {
  it('includes checklist steps in leaf progress', () => {
    const nodes = [
      node({ id: 'home', title: 'Main', parent_id: null }),
      node({ id: 'leaf', title: 'Bank', description: checklistDescription }),
    ]
    const lookup = buildProgressLookup(nodes)
    expect(lookup.get('leaf')).toEqual({
      totalSubtaskCount: 2,
      completedSubtaskCount: 1,
      completionPercent: 50,
    })
  })
})
```

Note: if `system_role` is not yet on `NodeRecord`, add `system_role: null` to the helper after Task 1 of the inbox plan, or omit until types are updated — for this plan slice, use `as NodeRecord` cast without `system_role` until Part 2 lands.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flow/treeLayout.test.ts`

Expected: FAIL — `totalSubtaskCount` is 0.

- [ ] **Step 3: Update `buildProgressLookup`**

Import `parseChecklistProgress` from `@/lib/editor/checklistProgress`.

Inside the loop that sets `progressByNode` for each node, after computing child summary:

```ts
const checklist = parseChecklistProgress(node.description)
const totalSubtaskCount = summary.totalSubtaskCount + checklist.total
const completedSubtaskCount = summary.completedSubtaskCount + checklist.completed
```

Use `totalSubtaskCount` for percent calculation (keep existing `|| 1` guard for empty leaves).

Export `buildProgressLookup` if it is not already exported.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/flow/treeLayout.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/flow/treeLayout.ts src/lib/flow/treeLayout.test.ts
git commit -m "feat: roll checklist steps into node progress summary"
```

---

### Task 3: Task list input rule and CSS

**Files:**
- Modify: `src/lib/editor/extensions.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add markdown-style input rule**

In `extensions.ts`, replace the plain `TaskItem.configure({ nested: true })` with:

```ts
import { InputRule } from '@tiptap/core'

// inside configure:
TaskItem.configure({ nested: true }).extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*-\s*\[\s*\]\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).toggleTaskList().run()
        },
      }),
    ]
  },
}),
```

- [ ] **Step 2: Add CSS**

Append to `globals.css` inside the existing tiptap block:

```css
.tiptap-wrapper .tiptap ul[data-type='taskList'] {
  @apply list-none space-y-1 pl-0;
}

.tiptap-wrapper .tiptap ul[data-type='taskList'] li {
  @apply flex items-start gap-2;
}

.tiptap-wrapper .tiptap ul[data-type='taskList'] li > label {
  @apply mt-1 flex shrink-0 items-center;
}

.tiptap-wrapper .tiptap ul[data-type='taskList'] li > label input[type='checkbox'] {
  @apply h-4 w-4 rounded border border-slate-300;
}

.tiptap-wrapper .tiptap ul[data-type='taskList'] li[data-checked='true'] > div > p {
  @apply text-muted-foreground line-through;
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/editor/extensions.ts src/app/globals.css
git commit -m "feat: style task lists and accept - [ ] markdown input"
```

---

### Task 4: Editor toolbar

**Files:**
- Create: `src/components/panel/EditorToolbar.tsx`
- Modify: `src/components/panel/MarkdownEditor.tsx`

- [ ] **Step 1: Create toolbar**

```tsx
'use client'

import type { Editor } from '@tiptap/react'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('taskList') ? 'default' : 'secondary'}
        className={cn('h-8')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        aria-label="Toggle checklist"
      >
        <ListChecks className="mr-2 h-4 w-4" />
        Checklist
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Wire into MarkdownEditor**

Import `EditorToolbar`. Render `<EditorToolbar editor={editor} />` above `<EditorContent />`.

- [ ] **Step 3: Run `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/panel/EditorToolbar.tsx src/components/panel/MarkdownEditor.tsx
git commit -m "feat: add checklist toolbar to description editor"
```

---

### Task 5: Auto-complete on all steps checked

**Files:**
- Modify: `src/components/panel/MarkdownEditor.tsx`

- [ ] **Step 1: Extend debounced save**

Import `parseChecklistProgress` and read `nodes` / `updateNode` from store.

In the debounced callback after `updateNode(nodeId, { description: content })`:

```ts
const progress = parseChecklistProgress(content)
const current = useNodeStore.getState().nodes.find((n) => n.id === nodeId)
if (!current) return

if (progress.total > 0 && progress.completed === progress.total && !current.completed) {
  await updateNode(nodeId, { completed: true })
}
if (progress.total > 0 && progress.completed < progress.total && current.completed) {
  await updateNode(nodeId, { completed: false })
}
```

Apply the same logic in the unmount flush effect.

- [ ] **Step 2: Run `npx tsc --noEmit`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/panel/MarkdownEditor.tsx
git commit -m "feat: auto-complete nodes when all checklist steps are done"
```

---

### Task 6: Step count in detail panel

**Files:**
- Modify: `src/components/panel/NodeDetailForm.tsx`

- [ ] **Step 1: Show progress label**

Import `parseChecklistProgress`.

Before `<MarkdownEditor />`:

```tsx
const checklist = parseChecklistProgress(node.description)
// in JSX, inside the Description section:
<div className="flex items-center justify-between gap-2">
  <Label>Description</Label>
  {checklist.total > 0 && (
    <span className="text-xs text-muted-foreground">
      {checklist.completed}/{checklist.total} steps
    </span>
  )}
</div>
```

Remove the duplicate standalone `<Label>Description</Label>` if present.

- [ ] **Step 2: Commit**

```bash
git add src/components/panel/NodeDetailForm.tsx
git commit -m "feat: show checklist step count in node detail panel"
```

---

### Task 7: E2E tests

**Files:**
- Create: `tests/e2e/checklists.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { expect, test } from '@playwright/test'
import { closePanel, requireE2ECredentials, signIn } from './helpers'

test.beforeEach(requireE2ECredentials)

test('inserts checklist via toolbar and auto-completes the node', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Title').fill('Bank paperwork')
  await page.getByRole('button', { name: 'Checklist' }).click()
  const editor = page.locator('.tiptap')
  await editor.click()
  await page.keyboard.type('Bring ID')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Bring form')
  await closePanel(page)
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Title').fill('Other')
  await page.locator('.react-flow__node', { hasText: 'Bank paperwork' }).click()
  await expect(page.getByText('0/2 steps')).toBeVisible()
  const checkboxes = page.locator('.tiptap input[type="checkbox"]')
  await checkboxes.nth(0).check()
  await checkboxes.nth(1).check()
  await page.waitForTimeout(900)
  await expect(page.getByText('Completed')).toBeVisible()
})
```

Adjust selectors if panel opens on leaf click via canvas handler.

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e tests/e2e/checklists.spec.ts`

Expected: PASS (with Supabase env + migration applied).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/checklists.spec.ts
git commit -m "test: cover checklist toolbar and auto-complete"
```

---

### Task 8: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add under Features**

- **Checklists** — TipTap task lists in the description editor (Checklist button or `- [ ]`). Step count in the panel; checking all steps marks the node completed.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: describe inline checklists"
```
