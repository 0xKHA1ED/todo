# Mindmap Tasks

A personal productivity app that treats life as nested places. You always stand in one place (Home, a project, or an area) and see Now, Forgotten, and hybrid-weighted direct children — never the whole-life forest. Built with Next.js (static export), Supabase, React Flow, TipTap, and Shadcn UI. Deploys to GitHub Pages.

---

## Features

- **Place UI** — Opening the app always stands you at **Home** (the hidden root). Nested descendants stay packed inside child area cards until you enter that place.
- **Inbox ritual** — Every user gets a dedicated Inbox place under Home. Press **C** from the map to quick-capture a task from anywhere, optionally parsing trailing `#tags`, then file it later by clicking a visible subtree on the map or searching destinations from the filing banner.
- **Now** — Up to **5** urgent tasks from the current place’s subtree (overdue, due today, next 7 days, then high-urgency undated). Extra matches show as a quiet “N more” count.
- **Forgotten** — Exactly one stale child of the current place. Prefers an area whose `last_visited_at` is null or older than **14 days**; otherwise the oldest stale leaf not already in Now. Hidden when nothing is stale.
- **Context lenses** — At Home, toggle **Errands**, **At computer**, **Calls**, or **At home** to see incomplete tagged leaves across the full tree without opening a second task view.
- **Hybrid densities** — Direct children only, weighted Loud / Medium / Area / Compact. Progress, tags, and full urgency live in the detail panel, not on every card.
- **Add** always creates a child of the current place. **Show done** reveals completed nodes (compact, struck through).
- **Inline checklists** — TipTap descriptions support checklist blocks from the toolbar or **Mod+Shift+9**, live step counts in the panel, `- [ ]` markdown conversion, and auto-complete when every step is checked.
- TipTap WYSIWYG rich-text description per node (Notion-style)
- Slide-out detail panel without leaving the place
- Keyboard: **C** opens quick capture from anywhere; **Tab** on a selected non-root node creates a child and enters that place; **Enter** enters an area (has children) or opens the panel; **Delete** deletes (not Backspace)
- Drag-and-drop re-parenting among visible children of the current place (entire subtree moves with the node)
- Command palette (**Ctrl+K**) — searches titles and markdown content, then jumps to the hit’s **parent place** (not viewport pan)
- Email/Password auth via Supabase Auth with Row-Level Security

### Context Tags

Use these fixed tags to power Home lenses:

- `errands` → **Errands**
- `computer` → **At computer**
- `calls` → **Calls**
- `home` → **At home**

Quick capture only parses trailing `#tag` tokens into the node tag array, for example `Bank form #errands`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| Canvas | React Flow (`@xyflow/react`) |
| State | Zustand |
| Editor | TipTap |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Testing | Vitest + Playwright |
| Deployment | GitHub Pages |

---

## Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) account (free tier is sufficient)
- A GitHub repository with Pages enabled (for production deployment)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/<your-org>/todo.git
cd todo
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# Leave blank for local dev (no base path needed)
NEXT_PUBLIC_BASE_PATH=
```

> Both values are found in your Supabase project under **Project Settings → API**.

### 3. Apply the database schema

See the [Supabase Setup](#supabase-setup) section below, then run:

```bash
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Supabase Setup

### 1. Create a project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, choose an organization, enter a project name and database password, and select a region close to your users.
3. Wait for the project to finish provisioning (~1–2 minutes).

### 2. Apply the database schema

Open the **SQL Editor** in your Supabase dashboard and run the migrations **in order**:

1. [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) — creates the `nodes` table with the core columns (`id`, `user_id`, `parent_id`, `title`, `urgency`, `date`, `tags`, `description`, `position_x`, `position_y`, `sort_order`, `created_at`, `updated_at`), a GIN index on `tags`, an `updated_at` trigger, and **Row-Level Security (RLS)** so users can only read and write their own nodes.
2. [`supabase/migrations/002_add_node_completion.sql`](supabase/migrations/002_add_node_completion.sql) — adds `nodes.completed`.
3. [`supabase/migrations/003_add_last_visited_at.sql`](supabase/migrations/003_add_last_visited_at.sql) — adds `nodes.last_visited_at` (nullable timestamptz). Existing rows stay null (never visited) and are eligible for Forgotten. Standing in a place sets `last_visited_at` on that node and its ancestors.
4. [`supabase/migrations/004_add_system_role.sql`](supabase/migrations/004_add_system_role.sql) — adds `nodes.system_role` and the per-user Inbox uniqueness index used by quick capture and Home Inbox surfacing.

If the project already has `001` applied, still run `002`, `003`, and `004`. Inbox, quick capture, and context lenses require `004`.

### 3. Enable Email/Password auth

1. In your Supabase dashboard go to **Authentication → Providers**.
2. Ensure the **Email** provider is enabled.
3. Under **Authentication → URL Configuration**, add your site URL (e.g. `https://<your-org>.github.io/todo`) to **Site URL** and the same URL to **Redirect URLs**.

### Auth URLs and email login

1. **Authentication → URL Configuration:** set **Site URL** to `http://localhost:3000` locally and `https://<org>.github.io/todo` in production.
2. **Redirect URLs** must include:
   - `http://localhost:3000/reset-password/**`
   - `http://localhost:3000/auth/callback/**`
   - `https://<org>.github.io/todo/reset-password/**`
   - `https://<org>.github.io/todo/auth/callback/**`
3. Enable **Email OTP** (**Authentication → Providers → Email**).
4. Recovery and magic-link templates may include both the token (`{{ .Token }}`) and `{{ .ConfirmationURL }}`.
5. Users can sign in with password, **Forgot password?**, or **Email me a code instead**. Signup remains email + password.

### 4. (Optional) Seed a test user

The app automatically creates a root "Main" node the first time a user logs in. You can register directly from the login page — no manual seeding is required.

To create a dedicated E2E test account, register through the app UI and note the email/password for use as GitHub Secrets (see CI/CD section).

### 5. Retrieve API keys

From **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project API keys → anon / public** |

---

## Production Deployment (GitHub Pages)

### 1. Enable GitHub Pages

1. In your GitHub repository go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.

### 2. Add repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `E2E_USER_EMAIL` | Email of a registered test account |
| `E2E_USER_PASSWORD` | Password of that test account |

### 3. Deploy

Push to the `master` branch (or trigger the workflow manually from **Actions → Deploy to GitHub Pages → Run workflow**).

The workflow defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Installs dependencies and Playwright browsers.
2. Runs `next lint`, then `npm test` (Vitest), then `next build`.
3. Executes the full Playwright E2E suite.
4. On success, uploads the `out/` directory and deploys it to GitHub Pages.

The deployed app will be available at:

```
https://<your-org>.github.io/todo/
```

> **Base path:** The `NEXT_PUBLIC_BASE_PATH` env var is set to `/todo` during the production build. If your repository is named differently, update this value in the workflow file and in your `.env.local` accordingly.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Full URL of your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public API key |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for static export (e.g. `/todo`). Leave empty for local dev. |

---

## Running Tests

### Unit tests (Vitest)

Place-model unit tests (Now, Forgotten, densities, visit targets):

```bash
npm test
```

New coverage includes checklist progress parsing, Inbox helpers, and context-lens ranking.

Watch mode:

```bash
npm run test:watch
```

### End-to-end (Playwright)

Install Playwright browsers once:

```bash
npx playwright install --with-deps chromium
```

Run the E2E suite (starts a dev server automatically):

```bash
npm run test:e2e
```

Open the Playwright UI for interactive debugging:

```bash
npm run test:e2e:ui
```

E2E tests require the following environment variables to be set (Supabase URL/key + a valid test account):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
E2E_USER_EMAIL=...
E2E_USER_PASSWORD=...
```

If the shared Supabase test database has not applied [`supabase/migrations/004_add_system_role.sql`](supabase/migrations/004_add_system_role.sql), the new Inbox/lens Playwright specs will skip with a migration reminder.

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── login/            # Email/password login page
│   └── map/              # Place screen (auth-protected)
├── components/
│   ├── auth/             # AuthGuard, LoginForm
│   ├── canvas/           # Place-scoped React Flow, custom node/edge, toolbar
│   ├── palette/          # Command palette (Ctrl+K)
│   ├── panel/            # Slide-out detail panel, Markdown editor
│   ├── place/            # PlaceScreen, breadcrumb, Now, Forgotten
│   └── ui/               # Shadcn UI primitives
├── hooks/                # useCommandSearch, useKeyboardNav
├── lib/
│   ├── editor/           # TipTap extensions
│   ├── flow/             # Compact tree layout + progress rollup helpers
│   ├── place/            # Now, Forgotten, density, visit targets
│   ├── store/            # Zustand stores (auth, nodes, UI)
│   └── supabase/         # Supabase client + CRUD queries
└── types/                # Shared TypeScript types
supabase/
├── migrations/           # SQL migration files (001, 002, 003, 004)
└── seed.sql              # Notes on seeding
tests/
└── e2e/                  # Playwright test specs
```
