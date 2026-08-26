# Life PM — Full implementation prompt (copy-paste for AI agent)

Use this prompt in a **new agent session** with the repo open. Attach or reference `PM_Plan.md`.

---

## Prompt (copy below this line)

You are implementing the **full Life PM overhaul** for this repository. This is a multi-release project — implement **all releases R1 through R7** in order without stopping after the first phase unless blocked by a hard error you cannot resolve.

### Source of truth

Read these before writing code:

1. **`PM_Plan.md`** (root) — **primary spec**. Read entirely, then implement from the [Agent Implementation Brief](#agent-implementation-brief) section (R1–R7).
2. **`docs/life-pm/session-md-format.md`** — session MD contract for parser + prompt builder.
3. **`docs/life-pm/examples/*.md`** — golden files for parser tests.

**Do not re-debate locked decisions** in PM_Plan.md (hierarchy, UX, workflow stages, nested modules, container vs leaf, non-goals). If something is ambiguous, follow PM_Plan.md and document your assumption in a short comment or commit message.

### Already done (do not redo)

- **P0:** Session MD format v1.0
- **P1:** Cursor `life-pm` skills in `~/.cursor/skills/` (external to repo — no app work needed)

### Your mission

Transform this place-based todo app into **Life PM**:

- **Portfolio-first Home** — project card grid (not mind map at root)
- **Hierarchy** — domain → project → module (recursive, unlimited depth) → task
- **Container vs leaf** — hubs for nodes with child modules; workflow only on leaves
- **6-stage workflow** — problem → shape → plan → spec → execute → review (enforced gates)
- **Think mode UX** — split layout: checklist left, TipTap doc right
- **Do mode UX** — list default, map tab; tasks only in execute stage
- **Cursor handoff** — Copy Cursor prompt + Import session MD (no in-app AI)
- **Preserve** — single `nodes` tree, auth, inbox, quick capture (`C`), lenses, Now/Forgotten, mind map inside projects/modules

### Implementation order (complete ALL)

| Release | Focus |
|---------|--------|
| **R1** | Migration `005_life_pm.sql`, types, `workflowModel.ts` |
| **R2** | `sessionMdParser`, `buildCursorPrompt`, import store method, unit tests |
| **R3** | `ModuleHub`, `ModuleDashboard` (Think split layout), stage strip, Copy/Import/Sign-off |
| **R4** | Workflow gates, break-glass, inbox promote to project/module |
| **R5** | `PortfolioDashboard`, `ProjectCard` with attention module pick |
| **R6** | Kind-aware creation, nested modules, breadcrumb |
| **R7** | E2E updates, README, polish, localStorage persistence |

Follow the **exact acceptance checklists** (A1–G3) in PM_Plan.md for each release. Check off each item; do not skip releases.

### Rules

1. **Implement R1 → R7 sequentially.** Finish each release's acceptance criteria before starting the next.
2. **Run `npm test` after every release.** Fix failures before continuing.
3. **Run `npm run build`** before claiming done — static export must succeed.
4. **Run `npm run test:e2e`** after R4+ (or when e2e tests exist). Fix or update tests with justification.
5. **Match existing patterns** — Zustand stores, Shadcn UI, colocated `*.test.ts`, Supabase migrations, place-based navigation where applicable.
6. **Minimize scope** — do not build non-goals listed in PM_Plan.md (no kanban, no in-app AI, no templates, no URL routes per place).
7. **One migration file** `supabase/migrations/005_life_pm.sql` unless a follow-up is strictly necessary — document why.
8. **Do not commit secrets.** Do not change git config.

### Key technical decisions (locked)

- Enrich `nodes` table with PM fields (`kind`, `workflow_stage`, `stage_docs` JSONB, etc.) — see PM_Plan.md schema.
- `module` can parent `module` (nested modules). Container = has child modules → hub UI, no workflow on parent.
- `portfolioModel.pickAttentionModule()` — one muted module name on project cards per algorithm in PM_Plan.md.
- `viewMode`: `portfolio` | `hub` | `think` | `map` | `list`.
- Parser tests must use golden examples in `docs/life-pm/examples/`.

### Verification before you stop

All of the following must pass:

```bash
npm test
npm run build
npm run test:e2e   # if env vars available; otherwise note what's needed
```

Confirm:

- [ ] All R1–R7 acceptance items in PM_Plan.md are satisfied
- [ ] Portfolio home is default at `/map`
- [ ] Leaf module shows Think split layout with stage strip
- [ ] Container project/module shows hub grid
- [ ] Session MD import + Copy Cursor prompt work
- [ ] Tasks blocked before execute stage
- [ ] Nested `module → module → module` works
- [ ] README updated

### When finished

Provide a summary:

1. What was implemented per release (R1–R7)
2. New files created
3. Migration instructions for existing deployments
4. Test results (`npm test`, `npm run build`, e2e if run)
5. Anything deferred and why

**Start by reading `PM_Plan.md` and exploring the codebase structure, then begin R1.**
