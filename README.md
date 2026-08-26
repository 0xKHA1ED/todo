# Life PM

A personal **project stewardship** app: portfolio of life projects, nested modules, and a gated think-then-do workflow. Capture still lives in Inbox (`C`). Execution still has Now, Forgotten, lenses, and a mind map — inside a project or module, not as the home screen. Built with Next.js (static export), Supabase, React Flow, TipTap, and Shadcn UI. Deploys to GitHub Pages.

---

## Features

- **Portfolio Home** — `/map` opens a **project card grid** grouped by domain and status (Active / Paused / Ideas / Done). Not a mind map.
- **Hierarchy** — `domain → project → module` (modules nest without depth limit) → `task`. Container nodes (with child modules) show a hub; leaf nodes run workflow.
- **6-stage workflow** on every **leaf** project or module: Problem → Shape → Plan → Spec → Execute → Review. Later stages stay locked until you sign off. Tasks can only be created in **Execute**.
- **Think mode** — Split layout: stage checklist on the left, TipTap stage document on the right, traffic-light stage strip, **Copy Cursor prompt** and **Import session MD**.
- **Do mode** — List is the default in Execute; Map is a tab (existing mind map). Now (max 5) sits in the Execute sidebar.
- **Cursor handoff** — No in-app AI. Copy a kickstart prompt, facilitate in Cursor with `@life-pm`, import the session export markdown back into the app. Import never auto-advances gates.
- **Break-glass** — Emergency skip to Execute with a required reason; flagged on the module and used in portfolio attention pick.
- **Inbox** — Header badge + slide-over. **File as task** (only onto Execute leaves) or **Promote to project/module** (starts at Problem, seed text in the Problem doc). Quick capture **C** still works everywhere.
- **Attention line** — Each project card shows at most **one** descendant module title (muted) using the locked priority algorithm.
- **Forgotten** — One stale leaf surfaced on the portfolio.
- **Context lenses** — Portfolio toolbar: Errands / At computer / Calls / At home.
- **Persistence** — `currentPlaceId` and `viewMode` are stored in `localStorage`.
- **Inline checklists** — TipTap descriptions support checklist blocks, step counts, and auto-complete.
- Keyboard: **C** capture, **⌘K / Ctrl+K** search, **Delete** deletes the selected node (not Backspace)
- Email/Password auth via Supabase Auth with Row-Level Security

### Life PM workflow (leaf projects and modules)

| Stage | You produce | Gate |
|-------|-------------|------|
| Problem | Pain, who, why now, constraints, not-solving | Written + sign-off |
| Shape | ≥3 options, tradeoffs, chosen direction | Direction + sign-off |
| Plan | Approach, phases, risks, non-goals | Ready for Spec |
| Spec | Requirements, acceptance criteria, verification | Ready for Execute |
| Execute | Tasks with definition of done | All tasks done |
| Review | Problem revisited, surprises, learnings | Required to close a **project**; optional for modules |

Session markdown format: [`docs/life-pm/session-md-format.md`](docs/life-pm/session-md-format.md).

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
5. [`supabase/migrations/005_life_pm.sql`](supabase/migrations/005_life_pm.sql) — Life PM columns (`kind`, `pm_status`, `outcome`, `domain_tag`, `health`, `workflow_stage`, `stage_docs`, `decisions`, `break_glass`, …) and backfill of existing Home children as grandfathered Execute projects.

If the project already has `001` applied, still run `002`–`005`. Inbox and lenses require `004`. Portfolio, workflow, and session import require `005`.

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

If the shared Supabase test database has not applied [`supabase/migrations/004_add_system_role.sql`](supabase/migrations/004_add_system_role.sql) or [`supabase/migrations/005_life_pm.sql`](supabase/migrations/005_life_pm.sql), the Inbox/lens/Life PM Playwright specs will skip with a migration reminder.

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── login/            # Email/password login page
│   └── map/              # Place screen (auth-protected) — portfolio / hub / think / list / map
├── components/
│   ├── auth/             # AuthGuard, LoginForm
│   ├── canvas/           # Place-scoped React Flow, custom node/edge, toolbar
│   ├── palette/          # Command palette (Ctrl+K)
│   ├── panel/            # Slide-out detail panel, Markdown editor
│   ├── place/            # PlaceScreen, header, breadcrumb, Inbox sheet, Now, Forgotten
│   ├── portfolio/        # Portfolio dashboard, project cards, module hubs
│   ├── workflow/         # Think dashboard, stage strip, import/sign-off/break-glass
│   └── ui/               # Shadcn UI primitives
├── hooks/                # useCommandSearch, useKeyboardNav
├── lib/
│   ├── editor/           # TipTap extensions
│   ├── flow/             # Compact tree layout + progress rollup helpers
│   ├── life-pm/          # Workflow model, session MD parser, Cursor prompt builder
│   ├── place/            # Now, Forgotten, density, visit targets
│   ├── portfolio/        # Domain grouping + attention-module pick
│   ├── store/            # Zustand stores (auth, nodes, UI)
│   └── supabase/         # Supabase client + CRUD queries
└── types/                # Shared TypeScript types
supabase/
├── migrations/           # SQL migration files (001–005)
└── seed.sql              # Notes on seeding
tests/
└── e2e/                  # Playwright test specs
```
