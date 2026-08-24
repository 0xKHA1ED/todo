# Life OS enhancements: Inbox capture, context lenses, inline checklists

Date: 2026-08-24

This spec adds three capabilities to the place-based life map so the app works at capture time (walking out the door), execution time (batching errands), and step granularity (bank paperwork, meal lists) without a second task database or a calendar product.

The data model stays one tree of nodes per user. Inbox is a reserved system child under Home. Context lenses are client-derived views over existing tags. Checklists live inside TipTap `description` JSON, not as child nodes.

## Problem

1. **Capture friction** — A thought like “bring Form 23B to the bank” requires standing in the right place before Add works. Lost thoughts are lost work.
2. **Execution friction** — Life runs by context (errands, at computer, phone calls), not by project tree. Now shows urgency across a subtree but not “everything tagged errands due this week.”
3. **Granularity mismatch** — Child nodes for every checklist step (ID, form, account number) pollutes the place map. TipTap already loads TaskList extensions but there is no toolbar, styling, progress rollup, or discoverable workflow.

## Goals

- Capture a task in one keystroke from anywhere; file it later.
- Enter a deliberate **lens** at Home to see cross-tree work batched by context tag.
- Use checkbox lists inside a node’s description for execution steps, with progress visible in the panel and optional auto-complete.

## Non-goals

- No second tasks table, no calendar, no mobile-native app, no always-on filter bar.
- No NLP / AI placement. Quick capture may parse `#tags` from the title string only.
- No custom user-defined lenses in v1 (fixed set of four).
- No checklist items as separate searchable nodes (they stay in description JSON).
- No PWA / offline work in this spec.

## Implementation order

Three independent slices. Ship in this order:

1. **Part 1 — Inline checklists** (no schema change; extends TipTap + progress).
2. **Part 2 — Inbox + quick capture** (schema `system_role`, ensure Inbox node, UI + shortcut).
3. **Part 3 — Context lenses** (pure client; uses tags from Parts 1–2).

---

# Part 1 — Inline checklists

## Architecture

Checklist items are TipTap `taskList` / `taskItem` nodes inside `nodes.description` (JSON). The editor already registers these extensions; this slice makes them usable and meaningful.

`src/lib/editor/checklistProgress.ts` walks description JSON and returns `{ total, completed }`. `buildProgressLookup` in `treeLayout.ts` merges child-node progress with checklist progress on each node’s own description so the detail panel can show “3/5 steps” without canvas chrome.

## Editor UX

- **Toolbar** above the editor in the detail panel: one **Checklist** button toggles a task list at the cursor (`toggleTaskList()`).
- **Keyboard** inside the editor: `Mod+Shift+9` toggles task list (TipTap default for TaskList when bound).
- **Markdown habit**: typing `- [ ]` at line start converts to a task item (custom `inputRules` on TaskItem extension).
- **Styling** in `globals.css`: visible checkboxes, strike-through on checked items, spacing consistent with bullet lists.

## Progress and completion

- Panel shows a quiet line under the Description label when the node has checklist items: `2/5 steps` (only when `total > 0`).
- **Auto-complete**: when the user checks the last open checklist item and `total > 0`, set `completed: true` on the node. When they uncheck any item on a completed node, set `completed: false`. Debounced with the same 800ms save as description (apply on flush, not every keystroke).
- Checklist progress does **not** change card density on the canvas (non-goal from original place spec).

## Interaction

- Checking items does not open/close the panel or change place.
- Nested task lists allowed (existing `nested: true` on TaskItem).

## Tests

- Unit: `parseChecklistProgress` on sample TipTap JSON (empty, mixed, all done, no task list).
- Unit: merged progress in `buildProgressLookup` when a leaf has checklist-only progress.
- E2E: open panel, insert checklist via toolbar, check items, see step count update, all checked → node marked completed in panel.

---

# Part 2 — Inbox + quick capture

## Architecture

Each user has exactly one **Inbox** node: direct child of the hidden root (`parent_id = root.id`), `system_role = 'inbox'`, title `"Inbox"`. Created in `fetchAllNodes` when missing (same pattern as root `"Main"`).

Quick capture always creates an incomplete leaf under Inbox. Triage uses the existing **Move subtree** flow plus a faster **File** action from the Inbox list.

## Data

Migration `004_add_system_role.sql`:

```sql
ALTER TABLE public.nodes
ADD COLUMN IF NOT EXISTS system_role TEXT
  CHECK (system_role IS NULL OR system_role = 'inbox');

CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_user_inbox
  ON public.nodes (user_id)
  WHERE system_role = 'inbox';
```

- `system_role` is null for normal nodes.
- Inbox cannot be deleted or reparented (guard in `deleteNode` / `reparentNode` like root).
- Inbox title is editable in the panel but `system_role` stays `inbox`.

`NodeRecord` gains `system_role: 'inbox' | null`.

## Quick capture

- **Shortcut**: `Ctrl+Shift+N` (and `Meta+Shift+N` on Mac) from the map screen. Works even when the slide-out panel is closed. Does not fire when focus is in inputs, TipTap, or command palette (same `shouldIgnoreShortcut` rules as other canvas shortcuts).
- **UI**: modal dialog (`QuickCaptureDialog`) with a single title field, primary **Add to Inbox**, secondary Cancel. On submit: `createNode({ parent_id: inboxId, title })`, close dialog, toast `Captured`.
- **Title parsing** (optional, deterministic): trailing `#word` tokens become tags (same rules as `parseTags`); stripped from title. Example: `Bank form #errands` → title `Bank form`, tags `['errands']`. No `@place` auto-move in v1.

## Inbox surfacing (Home ritual)

When standing at **Home** (root place), the left column order is:

1. **Inbox** (only if Inbox has at least one incomplete direct child)
2. **Now**
3. **Forgotten**

`InboxList` shows up to **8** incomplete direct children of Inbox, oldest `created_at` first. Overflow: quiet `{n} more in Inbox` with click standing in Inbox place.

Each row: title, optional tag chips, **File** button → opens existing Move dialog for that node (reuse move targets from `NodeDetailForm` logic extracted to a shared helper).

**Enter Inbox** link at bottom of the list stands in the Inbox place (normal area navigation).

Inbox is an area card on Home like any other child when you are at Home (density rules apply). It is not hidden.

## Interaction

- Toolbar **Add** at Home still creates a child of Home (project), not Inbox. Quick capture is the fast path to Inbox.
- Deleting Inbox node: blocked with error toast.
- Ctrl+K search includes Inbox children; jump behavior unchanged.

## Tests

- Unit: `getInboxId(nodes)`, `parseQuickCaptureTitle(title)`.
- Unit: `listInboxItems(nodes, inboxId)` ordering and cap.
- E2E: Ctrl+Shift+N capture, item appears in Inbox list at Home; File moves item under another project; item leaves Inbox list.

---

# Part 3 — Context lenses

## Architecture

A **lens** is a named execution mode at Home that lists incomplete **leaves** (nodes with no children) anywhere under the user’s tree whose `tags` include the lens tag. Areas are excluded from the list (enter the area to work the tree).

Fixed lenses (v1):

| Lens ID   | Label        | Tag matched (case-insensitive) |
|-----------|--------------|--------------------------------|
| `errands` | Errands      | `errands`                      |
| `computer`| At computer  | `computer`                     |
| `calls`   | Calls        | `calls`                        |
| `home`    | At home      | `home`                         |

Matching: `node.tags.some(t => t.toLowerCase() === lensTag)`.

`src/lib/place/contextLenses.ts` exports lens definitions and `rankLensItems(nodes, rootId, lensId, today)`.

## Ranking (within a lens)

Include incomplete leaves only. Sort:

1. `date < today` (overdue)
2. `date = today`
3. `date` in next 7 days
4. `urgency = high` (no date)
5. `sort_order`, then `created_at`

Cap at **20** items; overflow count shown. Completed nodes never appear.

## UI

When `currentPlaceId` is root **and** a lens is active:

- Left column: lens picker (four chips/tabs) + `LensList` (replaces Now/Forgotten/Inbox sections while lens active).
- Main area: short explanatory header (“Errands across your life”) instead of children canvas, **or** children canvas hidden. Children canvas is **hidden** while a lens is active so the mode feels deliberate. Breadcrumb shows `Home / Errands`.
- **Exit lens**: click `Home` in breadcrumb or press `Escape` when no panel open.

When no lens is active, behavior is unchanged (Inbox, Now, Forgotten, children).

Lens picker: row of four toggle buttons below the breadcrumb on Home only (`LensPicker`). Clicking an active lens again turns it off.

Picking a row: `enterPlace(item.parent_id)`, `selectNode(item.id)`, `openPanel(item.id)` (same as Ctrl+K for leaves).

`useUIStore` adds `activeLensId: string | null` and `setActiveLensId(id | null)`. `enterPlace` clears `activeLensId` when leaving root.

## Non-goals

- No lens editor. Document the four tags in README.
- No lens on non-Home places.

## Tests

- Unit: `rankLensItems` filtering, tag case, excludes areas, ordering, cap.
- E2E: seed leaves with `errands` tag in different projects; activate Errands lens; see both; click one → panel opens in correct parent place.

---

# Error handling (all parts)

- Quick capture with missing Inbox: ensure Inbox in `fetchAllNodes` before capture; if still missing, toast error.
- Move/File failures: existing toast patterns.
- Checklist auto-complete save failure: revert optimistic `completed` in store (same as `updateNode` rollback).
- Lens with zero matches: show empty state “No open tasks tagged errands. Add #errands to a tag field or quick capture.”

# README updates (after all slices)

Document: Inbox ritual, Ctrl+Shift+N, `#tag` in quick capture, four context tags, checklist toolbar and `Mod+Shift+9`, migration `004`.
