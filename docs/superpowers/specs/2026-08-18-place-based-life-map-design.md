# Place-based life map + email auth recovery

Date: 2026-08-18

This spec replaces the always-on full-life mindmap with a place-based UI, and adds forgot-password plus email-code login. The data model stays one tree of nodes per user. The change is what you see at once, and how you sign in when a password is the wrong tool.

## Problem

The current canvas shows every node as a 260×126 card (title, urgency pill, date, percent, progress bar, tags, focus button). Two things break at life scale:

1. Too many cards at once.
2. A bill due today looks the same as a multi-year business.

Hiding nodes entirely is also wrong: if something leaves the screen, it can leave memory. Opening “the full map” as a backup is the original wall of boxes.

The user treats life as nested projects (business, home, work, health), and those projects contain areas with their own trees.

## Goals

- One source of truth for all plans, from “build the business” to “pay the bill today.”
- Never show the whole-life forest, and never a project’s exploded nested tree.
- Keep every idea findable: names on the current place, Now for dates, Forgotten for stale areas, Ctrl+K for search.
- Visual weight follows time pressure and unfinished work, not equal posters.
- Password login remains. Users can also reset a password by email, or sign in with an email code / magic link.

## Non-goals

- No second database of tasks. No calendar product. No mobile-native app.
- No always-on tag/urgency filter bar. No MiniMap. No progress bars on canvas cards.
- Email-code signup is out of scope. New accounts stay email + password.
- Live mailbox E2E (actually receiving mail) is out of scope for CI.

---

# Part 1 — Place-based life map

## Architecture

You always **stand in one place**. Home is the hidden root node (today’s `"Main"`). A project is a direct child of that root. Marketing under Art Business is also a place. The same layout is used at every depth.

A place screen has four regions:

1. **Breadcrumb** — Home / Art Business / Finances
2. **Now** — up to 5 urgent tasks anywhere in this subtree
3. **Forgotten** — exactly one stale child of this place
4. **Children** — direct children only, hybrid-weighted

Nested descendants stay packed inside child area cards (`14 inside`, `1 due`, `16d`). They are not drawn until you stand in that child.

Opening the app always stands you at Home. The last project is not restored. Home is the Now + Forgotten ritual; resuming a project is how other projects die.

Clicking a Now item stands you in that item’s parent and selects it. Clicking Forgotten stands you in that area.

`Ctrl+K` stays global. A result jumps you to stand in the hit’s parent, selects the hit, and if the hit is a leaf, opens the detail panel.

Existing slide-out panel, create/delete, complete toggle, tags, urgency, dates, and rich-text notes stay. They operate on the selected node, not on a life-wide canvas.

## Now

Computed from the current place’s subtree. Completed nodes are excluded. Ranked, then **capped at 5**:

1. `date < today` (overdue)
2. `date = today`
3. `date` in the next 7 days
4. `urgency = high` and no date, only if slots remain

If more than 5 match, the rest stay off-screen until a higher-ranked item is completed, deleted, or its date changes. Show a quiet “N more” count, not the extra cards.

## Forgotten

Pick **one** child of the current place:

1. Prefer a child that **has children** (an area) whose `last_visited_at` is null or older than 14 days. Oldest first.
2. If no stale area, resurface the oldest stale **leaf** that is not in the current Now list, so undated work cannot vanish.
3. If nothing is stale, hide the slot. No fake reminders.

Standing in an area, or anywhere under it, counts as a visit (see Data). Opening Forgotten therefore clears that area from the slot and the next stale child may appear.

If the Forgotten node is completed or deleted, recompute immediately.

## Children and visual weight

Direct children only. Four densities:

| Density | When | Canvas look |
|---|---|---|
| Loud | Leaf overdue or due today; **or** area whose subtree has an overdue/today item | Large card, due label, strong border |
| Medium | Leaf due in 7 days or high urgency; **or** area whose subtree has such an item and is not loud | Mid card, date or “high” |
| Area | Child that has children, and is not loud/medium | Name + `N inside` + due/stale hints |
| Compact | Open leaf with no date and not high urgency | Title only |

Loud and medium **areas** still show `N inside` and still navigate like areas (Enter / double-click / Tab). Weight only changes chrome, not behavior.

Completed nodes are hidden unless **Show done** is on, in which they render compact and struck through. An area is also hidden when Show done is off and every descendant is completed.

Cards **must not** show: progress percent, progress bar, tag chips, urgency pills on compact nodes, focus buttons, hover-lift, or heavy shadow.

Progress, tags, and full urgency editing live in the detail panel.

Canvas: soft blank background, thin edges, no line grid, no MiniMap. Filter bar is removed. Command palette remains the way to search tags and titles.

## Interaction

- **Add** always creates a child of the current place.
- **Single-click leaf** — select and open the panel.
- **Enter or double-click area** — stand in that area.
- **Tab on an area** — create a child of that area **and** stand in it, so the new node is visible.
- **Escape** — close the panel.
- **Up** — breadcrumb click (or a Back control next to it). `Backspace` does **not** navigate; it remains unused on the canvas so it cannot fight node deletion.
- **Delete** — with confirm, delete the selected non-root node (unchanged).
- Drag-reparent only onto other **visible** children of the current place. The root cannot be dragged or deleted.
- Deleting the node you are standing in stands you in its parent.

Keyboard create-sibling on the canvas is replaced by Add. Enter is navigation / panel, not “new sibling,” so it does not fight “Enter on an area = go in.”

## Data

New nullable column: `nodes.last_visited_at timestamptz`.

Existing rows stay null = never visited = eligible for Forgotten.

**Visit rule:** standing in a place sets `last_visited_at = now()` on **that node and its ancestors**, not on descendants. Opening Art Business does not mark Design seen. Opening Design/Logo does mark Design seen.

Now, Forgotten, and densities are derived on the client. No extra tables.

`focusedNodeId` is replaced by `currentPlaceId`. Children, Add, Tab, and the canvas parent are that place.

If a visit write fails, navigation still happens. Retry in the background; toast only if it keeps failing.

First-time empty Home: quiet “Add a project,” not an empty React Flow.

## Components (map page)

Replace the current map chrome with:

- `PlaceScreen` — layout: breadcrumb + left column (Now, Forgotten) + children canvas
- `Breadcrumb`
- `NowList`
- `ForgottenCard`
- `ChildrenCanvas` — React Flow of direct children with four node variants
- `CustomNode` rewritten into loud / medium / area / compact
- Slide-out panel and command palette, same roles
- `CanvasToolbar` reduced to Add, Show done, Fit, Sign out

Remove from the default UI: `FilterBar`, MiniMap, focus-mode confirm dialog, per-node focus button.

Reuse: auth guard, node store, panel form, TipTap editor, command search (jump target changes as above).

## Place-map tests

Keep: auth password login, panel edit, command palette open/search, create/delete, completion toggle in the panel.

Rewrite:

- Focus-mode spec → place navigation: only direct children visible; grandchild hidden until you enter; breadcrumb goes up; app load always Home.
- Completion spec: drop “percent on parent cards”; keep panel complete/uncomplete; Show done reveals completed children.
- Filter-bar spec: delete.

Add:

- Now ranking and cap of 5.
- Forgotten prefers stale areas, 14-day / null visit, ancestor visit clears it, does not mark descendants.
- Loud / medium / area / compact densities.
- Tab on area creates a child and enters that area.
- Delete current place → parent.
- Ctrl+K jump stands in the parent.

---

# Part 2 — Forgot password and email-code login

Independent of the map. Same Supabase project. Static export / GitHub Pages must keep working (`detectSessionInUrl` is already on).

## Forgot password

1. Login screen grows a **Forgot password?** action (sign-in mode only).
2. User enters email and submits.
3. Call `resetPasswordForEmail` with `redirectTo` = `{origin}{basePath}/reset-password`.
4. Always show the same success copy: **If that email has an account, we sent a reset link.** Do not reveal whether the email exists.
5. Email uses Supabase’s recovery template. The link lands on `/reset-password`.
6. That page waits for a recovery session (hash/query tokens via the existing client). Then: new password, confirm password, min 6 characters, must match.
7. `updateUser({ password })`, then route to `/map` (Home).
8. Missing/expired session: “This reset link is invalid or expired” plus a link to request another.

## Email code / magic link

1. Login screen grows **Email me a code instead**.
2. User enters email (no password) and submits.
3. Call `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `{origin}{basePath}/auth/callback` } })`.
4. Same anti-enumeration success copy: **If that email has an account, we sent a code.**
5. Next screen: 6-digit code field, paste-friendly, plus **Resend** with a 60-second cooldown.
6. Submit calls `verifyOtp({ email, token, type: 'email' })`. On success, `/map`.
7. The same email’s magic link hits `/auth/callback`, which initializes auth and routes to `/map` on session, or back to login with an error if the link is bad.
8. Unknown email, because `shouldCreateUser: false`, still uses the generic success copy on send. Verify of a garbage code shows a normal error, not “no account.”

Signup, password sign-in, and sign-out stay as they are.

## Auth routes

| Route | Role |
|---|---|
| `/login` | Password sign-in/up, links to forgot + code |
| `/forgot-password` | Request reset mail |
| `/reset-password` | Set new password after recovery link |
| `/login/code` | Request + enter OTP |
| `/auth/callback` | Consume magic-link tokens, then route to `/map` |

Static export must include these pages. Do not fold them into login-mode flags; redirect URLs stay stable.

`redirectTo` / `emailRedirectTo` must include `NEXT_PUBLIC_BASE_PATH` (production `/todo`).

## Supabase dashboard (operator)

Document in README:

- Auth URL configuration: site URL and redirect URLs for local `http://localhost:3000/**` and production `https://<org>.github.io/todo/**`.
- Enable email OTP.
- Recovery and magic-link templates may include both the token and the confirmation URL.

## Auth tests

Playwright:

- Forgot-password form submits and shows the generic success copy.
- Reset-password page without a session shows the expired-link state.
- Email-code form shows the code field after submit and the generic success copy.
- Code field rejects empty submit.
- Existing password login tests still pass.

Do not assert on real inbox delivery in CI.

---

# Error handling (both parts)

- Existing create/delete/sign-in toasts stay.
- Visit write failures do not block navigation.
- Auth send endpoints always succeed visually if Supabase accepted the request; network failures toast “Could not send email.”
- Empty place: Add prompt, not a blank map.
- Cannot delete root. Cannot reparent root.

# Implementation order

Two slices, in this order:

1. Place-based map (schema `last_visited_at`, Place UI, tests rewrite).
2. Auth recovery (routes, README redirect URLs, auth tests).

Both slices are in scope. They share only login-page links. Do not treat Part 2 as optional.
