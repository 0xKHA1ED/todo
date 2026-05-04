# Mindmap Tasks

A personal productivity app that combines a hierarchical mindmap with rich per-node documentation. Built with Next.js (static export), Supabase, React Flow, TipTap, and Shadcn UI. Deploys to GitHub Pages.

---

## Features

- Infinite node nesting with parent/child relationships
- Urgency levels (Low / Normal / High) color-coded on the canvas
- Optional due-date badge and multi-tag support per node
- TipTap WYSIWYG rich-text description per node (Notion-style)
- Slide-out detail panel without leaving the canvas
- Keyboard-first creation: **Tab** = new child, **Enter** = new sibling
- Drag-and-drop re-parenting (entire subtree moves with the node)
- Visual filtering that hides non-matching nodes and recalculates layout
- Command palette (**Ctrl+K**) — searches titles and markdown content, jumps viewport
- Email/Password auth via Supabase Auth with Row-Level Security

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
| Testing | Playwright |
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
git clone https://github.com/<your-org>/mindmap-tasks.git
cd mindmap-tasks
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

Open the **SQL Editor** in your Supabase dashboard and run the contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).

This migration:

- Creates the `nodes` table with all required columns (`id`, `user_id`, `parent_id`, `title`, `urgency`, `date`, `tags`, `description`, `position_x`, `position_y`, `sort_order`, `created_at`, `updated_at`).
- Adds a GIN index on `tags` for fast filtering.
- Attaches an `updated_at` trigger that auto-updates on every row change.
- Enables **Row-Level Security (RLS)** and creates four policies so that users can only read and write their own nodes.

### 3. Enable Email/Password auth

1. In your Supabase dashboard go to **Authentication → Providers**.
2. Ensure the **Email** provider is enabled.
3. Under **Authentication → URL Configuration**, add your site URL (e.g. `https://<your-org>.github.io/mindmap-tasks`) to **Site URL** and the same URL to **Redirect URLs**.

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

Push to the `main` branch (or trigger the workflow manually from **Actions → Deploy to GitHub Pages → Run workflow**).

The workflow defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Installs dependencies and Playwright browsers.
2. Runs `next lint` and `next build`.
3. Executes the full Playwright E2E suite.
4. On success, uploads the `out/` directory and deploys it to GitHub Pages.

The deployed app will be available at:

```
https://<your-org>.github.io/mindmap-tasks/
```

> **Base path:** The `NEXT_PUBLIC_BASE_PATH` env var is set to `/mindmap-tasks` during the production build. If your repository is named differently, update this value in the workflow file and in your `.env.local` accordingly.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Full URL of your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public API key |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for static export (e.g. `/mindmap-tasks`). Leave empty for local dev. |

---

## Running Tests

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

Tests require the following environment variables to be set (Supabase URL/key + a valid test account):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
E2E_USER_EMAIL=...
E2E_USER_PASSWORD=...
```

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── login/            # Email/password login page
│   └── map/              # Main mindmap canvas (auth-protected)
├── components/
│   ├── auth/             # AuthGuard, LoginForm
│   ├── canvas/           # React Flow canvas, custom node/edge components
│   ├── filters/          # Filter bar
│   ├── palette/          # Command palette (Ctrl+K)
│   ├── panel/            # Slide-out detail panel, Markdown editor
│   └── ui/               # Shadcn UI primitives
├── hooks/                # useCommandSearch, useFilter, useKeyboardNav
├── lib/
│   ├── editor/           # TipTap extensions
│   ├── flow/             # Dagre layout engine helpers
│   ├── store/            # Zustand stores (auth, nodes, UI)
│   └── supabase/         # Supabase client + CRUD queries
└── types/                # Shared TypeScript types
supabase/
├── migrations/           # SQL migration files
└── seed.sql              # Notes on seeding
tests/
└── e2e/                  # Playwright test specs
```
