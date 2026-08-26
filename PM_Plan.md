# Life PM — Planning & Implementation Handoff

> **Agent-ready handoff document.** Living record of product decisions + executable implementation spec.  
> Last updated: 2026-08-26.  
> **Start here if implementing:** [Agent Implementation Brief](#agent-implementation-brief)

## Table of contents

1. [Vision & decisions](#vision) (product context)
2. [Target hierarchy](#target-hierarchy) (nested modules)
3. [UI/UX specification](#uiux-specification-locked) ← **visual & interaction design**
4. [Workflow enforcement](#workflow-enforcement-locked)
5. [Stage AI Sessions](#stage-ai-sessions-cursor-skills--app-handoff) (P0–P1 done)
6. [**Agent Implementation Brief**](#agent-implementation-brief) ← **implement from here**
7. [Decisions log](#decisions-log)

---

## Vision

Treat everything in life as a project — business ventures, home renovations, work codebases, career goals — not as a flat todo list. The app should feel like **project stewardship** (status, outcomes, phases, health) with **execution support** (capture, context lenses, next actions) layered on top.

**Primary entry experience (decided):** Opening the app shows a **dashboard of active life projects**, not a task-first view.

---

## Current State (baseline)

The app today is a **place-based life map** built on a single `nodes` tree:

```
Main (hidden root = Home)
├── Inbox (system node)
├── Project A
│   └── areas / tasks (unlimited nesting)
└── Project B
```

- One entity type (`nodes`) — "project" is a UI label for top-level children, not a DB concept.
- UI optimizes for **task execution**: Now, urgency, dates, completion, context lenses.
- Strong features already in place: Inbox + quick capture (`C`), place navigation, Forgotten, hybrid card densities, TipTap descriptions + inline checklists, Ctrl+K search.
- Design principle to preserve: **one source of truth** (single tree), no second tasks table.

See also: `docs/superpowers/specs/2026-08-18-place-based-life-map-design.md`, `docs/superpowers/specs/2026-08-24-life-os-enhancements-design.md`.

---

## Target hierarchy

```
Home (portfolio dashboard)
├── Inbox (capture — triage later)
├── Domain: IMS (professional / career)
│   ├── Project: Platform rewrite
│   │   ├── Module: Auth (container)
│   │   │   ├── Module: Token refresh (leaf → workflow)
│   │   │   └── Module: Session migration (leaf)
│   │   └── Module: Billing (container)
│   │       └── Module: Invoicing API (leaf)
│   └── Project: Dashboard redesign
├── Domain: Living room renovation (home)
│   └── Project: Flooring
└── Domain: Side business (business)
    └── ...
```

| Level | Purpose | Example | Nesting |
|-------|---------|---------|---------|
| **Domain** | Life area / context bucket | IMS, Home, Health | Under root only |
| **Project** | Coherent initiative with an outcome | Platform rewrite, Flooring | Under domain or root |
| **Module** | Sub-project / workstream; **recursive** | Auth, Token refresh, Billing | Under project **or** under another module — **unlimited depth** |
| **Task** | Executable work item | Fix bug #123 | Under **leaf** module in Execute only |

**Container vs leaf** (same `kind: module` or `project`):

| Node | Has child modules? | UI | Workflow |
|------|-------------------|-----|----------|
| Project | Yes | Project hub | None on project |
| Project | No | Think/Do dashboard | Full 6-stage on project |
| Module | Yes | Module hub | None on parent |
| Module | No | Think/Do dashboard | Full 6-stage on module |

Workflow runs on **leaf** projects and **leaf** modules only. Nesting replaces separate "phase" or "workstream" entity types.

---

## Core Redesign Ideas (agreed direction)

### 1. Portfolio dashboard at Home (locked UX)

- **Layout:** Card grid (Notion/Linear-ish), grouped by domain section headers.
- **Primary card unit:** **Project** — click opens project hub (child modules).
- **Card content:** Project title, `pm_status` pill, health border, outcome snippet (1 line), aggregate stage indicator — **not** busy.
- **Attention hint:** At most **one** descendant leaf module title in small muted text at card bottom (module name only — no stage, no extra metadata). See [Attention module pick](#attention-module-pick).
- **Sections:** Active (default expanded), Paused, Ideas, Done/Archived (collapsed).
- **Not on Home hero:** mind map, Now list, urgency pills, inbox body (inbox = header badge only).

### 2. Project as a first-class concept

Projects (and modules) gain metadata beyond title/tags:

- **Outcome** — "Done when…"
- **Status (`pm_status`)** — `idea` | `active` | `paused` | `done` | `archived`
- **Type/domain tag (`domain_tag`)** — `professional` | `home` | `business` | `personal` | `health` | `other`
- **Health** — `on_track` | `at_risk` | `stalled` | `blocked` (nullable)
- **Current workflow stage (`workflow_stage`)** — `problem` | `shape` | `plan` | `spec` | `execute` | `review`

### 3. Nested modules (locked)

Modules nest without depth limit: `project → module → module → … → task`.  
No separate "phase" or "workstream" kind — nesting **is** the structure.  
Each **leaf** module is a focused unit of work with its own workflow. Container modules are navigation/grouping hubs (like folders).

### 4. Project / module hub vs leaf dashboard (locked UX)

| Node type | Entry view when opened |
|-----------|------------------------|
| **Container project** | **Project hub** — grid of direct child modules (+ Add module). No stage strip. |
| **Container module** | **Module hub** — grid of direct child modules (+ Add submodule). No stage strip. |
| **Leaf project or leaf module** | **Think mode dashboard** (split checklist + doc) if before/during workflow; **Do mode** (list default) in Execute. |

Tabs on leaf nodes: **Overview | Map | List** (Board later). Container nodes: hub only in v1 (no Map of children on hub screen).

### 5. Language and UI weight shift

| Todo-list feel | PM feel |
|----------------|---------|
| "Add task" | "Add work item" / "Add to backlog" |
| Checkbox as hero | Milestone / phase progress as hero |
| Urgency everywhere | Status badges (active, blocked, paused) |
| Due dates on everything | Target dates on projects; due dates on near-term tasks |
| Inbox prominence at Home | Portfolio center; Inbox as capture utility |

### 6. Inbox evolution (decided requirement)

Quick capture stays (`C` from anywhere). Inbox items can be triaged as:

1. **Todo task** — file under an existing project/module (current behavior).
2. **Project seed** — promote to a new project (or module), which **starts at `problem` stage**, not execution.

Inbox is intentionally lightweight; structure is applied at triage/promotion time.

### 7. Enforced workflow (locked)

See [Workflow enforcement](#workflow-enforcement-locked), [UI/UX specification](#uiux-specification-locked), and [Agent Implementation Brief](#agent-implementation-brief).

---

## UI/UX specification (locked)

### Design principle: three modes

| Mode | Purpose | Screens | Feel |
|------|---------|---------|------|
| **Steward** | What's running in my life? | Portfolio Home, project/module hubs | Calm, scannable, status at a glance |
| **Think** | What am I deciding? | Leaf module/project workflow (stages 1–4) | Focused, checklist + doc, no task noise |
| **Do** | What's next? | Execute (list), Map tab, lenses, Now sidebar | Action-oriented, current app idioms |

Mode transitions should be obvious. Think screens **must not** show urgency pills, task checkboxes in the header, or canvas chrome.

### Global chrome (all modes)

```
┌────────────────────────────────────────────────────────────────┐
│  Life PM    Domain › Project › Module › …        [Inbox·3] ⌘K  │
├────────────────────────────────────────────────────────────────┤
│  … content …                                    (C) capture    │
└────────────────────────────────────────────────────────────────┘
```

- **Top bar:** breadcrumb (full ancestor chain for nested modules), Inbox badge (opens slide-over), ⌘K search.
- **Quick capture `C`:** works from any screen.
- **No permanent left sidebar in v1** — breadcrumb + Back to portfolio sufficient.
- **Persist:** `currentPlaceId` + `viewMode` in `localStorage` optional but recommended.

### Portfolio Home (Steward mode)

**Layout:** Responsive card grid, sections per domain (`IMS`, `Home`, `Uncategorized` for legacy flat projects).

**Project card anatomy:**

```
┌─────────────────────────────────────┐
│ ● Auth refactor          [Active]   │  ← pm_status pill; health = left border
│ Migrate auth without downtime…      │  ← outcome, 1 line truncated
│                                     │
│              Token refresh          │  ← attention module (muted xs, title only)
└─────────────────────────────────────┘
```

- Click card → **project hub** (not attention module directly).
- Empty attention line omitted if nothing needs attention.
- Domain headers are not clickable cards — cosmetic grouping only.

#### Attention module pick

Among all **leaf** descendant modules of the project (recursive), pick **at most one** title to show on the card. **Name only** — no stage, health, or dates on the card.

Priority (first match wins):

1. `break_glass` used and module still in Execute  
2. `health === 'blocked'`  
3. Workflow stage in progress (not `execute` complete) — prefer earliest incomplete stage  
4. Stale leaf (`last_visited_at` > 14 days) among active modules  
5. `health === 'at_risk'` or `'stalled'`  
6. If tie, alphabetical by module title  

Implement in `portfolioModel.pickAttentionModule(projectId)`.

### Project / module hub (Steward mode)

When opening a **container** project or module:

```
┌────────────────────────────────────────────────────────────────┐
│  IMS › Platform rewrite                                        │
│  Outcome: Ship v2 platform by Q4                               │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth         │  │ Billing      │  │ + Module     │          │
│  │ 2 submodules │  │ 1 submodule  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

- Show **direct children only** (place-based drill — same mental model as today).
- Child card shows: title, container vs leaf hint (`3 submodules` or stage dot for leaf).
- Click leaf child → Think/Do dashboard. Click container → deeper hub.

### Leaf dashboard — Think mode (locked: split layout B)

Stages 1–4 (`problem` through `spec`). **Not** Execute.

```
┌────────────────────────────────────────────────────────────────┐
│ [P🟢][S🟡][Pl⚪][Sp⚪][Ex🔒][Rv⚪]     [Copy prompt] [Import MD] │
├──────────────────┬─────────────────────────────────────────────┤
│ Stage checklist  │  Stage document (TipTap)                    │
│ ☑ Problem stmt   │                                             │
│ ☑ Who            │  Current stage content…                     │
│ ☐ Options (1/3)  │                                             │
│ ☐ Tradeoffs      │                                             │
│                  │                                             │
│ Locked: 2        │                                             │
│ Open: 1          │                                             │
├──────────────────┴─────────────────────────────────────────────┤
│                    [ Sign off Shape → ]  (primary, when ready)   │
└────────────────────────────────────────────────────────────────┘
```

- **Left column (~16rem):** checklist for active stage, locked decisions count, open questions count. Checklist items link-scroll to doc headings where possible.
- **Right column:** TipTap for `stage_docs[activeStage]`. Read-only for completed stages; editable for current only.
- **Stage strip:** traffic lights; locked future stages muted with tooltip "Unlocks after Spec" — never error styling.
- **Break-glass:** text link footer: "Emergency: skip to Execute…" → reason dialog → flag on card.

### Leaf dashboard — Do mode (Execute)

- **Default tab:** **List** — tasks with definition of done, link to spec criterion id.
- **Map tab:** existing mind map (spatial task layout).
- **Sidebar (optional):** scoped Now (max 5) for this module subtree.
- Stage strip shows Execute active; prior stages clickable read-only.

### Workflow enforcement feel (locked)

- **Guided, not punitive** — progress language, muted locks, no access-denied toasts.
- Future stages visible but disabled with helper text.
- Sign-off is a positive action ("Ready for Spec →"), not escaping a cage.
- Break-glass is shameful but available — visible flag on module and project attention pick.

### Inbox (utility, not hero)

- Header badge count; slide-over panel from right.
- Per item: **File as task** | **Promote to project/module** (modal: domain, parent project/module, title).
- Promote creates **leaf** at `problem` stage; seed text → Problem doc.
- Filing as task: existing map/search filing flow.

### Context lenses, Now, Forgotten

| Feature | Placement |
|---------|-----------|
| **Lenses** | Portfolio toolbar: "Run errands" etc. — **Do mode** cross-project execution overlay; not on Think screens |
| **Now** | Execute sidebar on leaf modules; optional small "next up" on project card **not** in v1 (keep card minimal) |
| **Forgotten** | Portfolio section or badge on stale **project** cards; opens project hub |

### Visual language

| Element | Treatment |
|---------|-----------|
| Stage lights | 🟢 complete · 🟡 in progress · ⚪ not started · 🔒 locked (muted, not red) |
| `pm_status` | Pill: Idea, Active, Paused, Done |
| `health` | 3px left border on project card: on_track=none, at_risk=amber, stalled=gray, blocked=red |
| Think vs Do | Think: no urgency/date on chrome. Do: urgency on tasks only |
| Aesthetic | Keep existing aurora/glass — calm, not generic SaaS |

### Empty states

| Screen | Copy / action |
|--------|----------------|
| Portfolio, no projects | "Add a domain or project" |
| Project hub, no modules | "Add a module to start thinking" |
| Leaf, Problem stage | Seed from inbox or "Copy Cursor prompt" CTA prominent |

### Responsive (v1)

- Desktop-first. Portfolio grid: 1 col mobile, 2–3 col desktop.
- Think split layout: stack checklist above doc on narrow screens (<768px).

---

### A. Enrich the existing tree (recommended start)

Add fields to `nodes` (or a small side table): `kind` (domain | project | module | task), `status`, `outcome`, `workflow_stage`, `domain_tag`, etc. Same single tree; UI branches on `kind`.

- **Pros:** Aligns with one-source-of-truth principle; incremental migration.
- **Cons:** Conditional UI complexity.

### B. Portfolio Home + view modes per project

Home = project list/dashboard. Inside a project: Overview | Map | List | (Board later).

- **Pros:** Biggest mental-model shift toward PM.
- **Cons:** More UI surface.

### C. Project templates (later)

Templates scaffold default phases, workflow stages, and preferred views per project type (Renovation, Software, Business).

- **Pros:** Handles diverse life projects.
- **Cons:** Most complex; defer until templates are clearly needed.

**Recommended path:** A + B first. Templates (C) when setup friction is felt.

---

## What We Keep From the Current App

| Feature | Role in new model |
|---------|-------------------|
| Place navigation | Drill into domain → project → module |
| Context lenses | Cross-project execution by context (errands, calls) |
| Inbox + quick capture | Capture without structure; triage later |
| Forgotten | Stale project/module detection at portfolio level too |
| TipTap + checklists | Execution detail inside tasks and spec documents |
| Now (scoped) | Next actions on project dashboard and inside places |
| Ctrl+K search | Global find across all content |

---

## Workflow enforcement (locked)

### User story

> "I work at IMS. I have a domain called IMS (professional). Inside it are projects. Inside each project are modules. Each module must force me through ideation → brainstorming → planning → specs before I can do execution tasks. I can't skip planning when I'm excited."

### Principles (locked)

1. **Sequential gates** — Stages unlock in order; later stages are locked until earlier ones are satisfied.
2. **Same pipeline at project and module level** — A module is a mini-project with the same discipline.
3. **Content per stage** — Each stage has a defined artifact (not just a checkbox).
4. **Motivation + enforcement** — UI shows progress and what's blocking advance; hard lock + sign-off (with break-glass escape hatch).
5. **AI accelerates drafting, human owns judgment** — Stages produce artifacts AI can help write, but a human must approve direction and success criteria before Execute.
6. **Verification before velocity** — In the AI era, the bottleneck moved from "writing" to "knowing what to build and proving it's right."

### v1: Universal pipeline (decided)

One workflow for all domains (IMS software, home renovation, side business). Same stage names and gates; stage prompts/hints adapt to context. Domain-specific templates deferred.

### Why the old "ideate → brainstorm → plan → spec" needs reframing for AI

| Old failure mode | AI-era failure mode |
|------------------|---------------------|
| Skip planning, start coding manually | Skip thinking, prompt AI to "just build it" |
| Vague specs → messy manual implementation | Vague specs → plausible but wrong AI output |
| Planning felt slow vs typing code | Planning feels slow vs watching AI generate code |
| Scope creep during implementation | Scope creep during AI iteration loops |

**The workflow must fight:** excitement → prompt → iterate in circles → ship something that doesn't solve the real problem.

**The workflow should embrace:** AI as a fast drafter inside each stage, with hard human gates before execution.

### Pipeline (locked)

Five stages. Each is a dedicated TipTap document tab. Tasks only exist in Execute.

```
PROBLEM → SHAPE → PLAN → SPEC → EXECUTE → REVIEW
```

| # | Stage | Core question | Artifact | Gate to advance |
|---|-------|---------------|----------|-----------------|
| 1 | **Problem** | What hurts, for whom, why now? | Problem statement + constraints | Problem written; "out of scope" list started |
| 2 | **Shape** | What are our options? Which do we pick? | Options explored, tradeoffs, chosen direction | One direction selected (or project cancelled) |
| 3 | **Plan** | How will we get there? What's the sequence? | Approach, milestones, risks, explicit non-goals | Plan written + sign-off |
| 4 | **Spec** | How do we know we're done? How do we verify? | Requirements, acceptance criteria, verification plan | Spec + verification criteria + sign-off |
| 5 | **Execute** | Do the work in verifiable slices | Tasks with definition-of-done each | All tasks done |
| 6 | **Review** | Did it work? What did we learn? | Retrospective notes | Required for **projects**; optional for **modules** |

**Stage names locked:** `problem` | `shape` | `plan` | `spec` | `execute` | `review` (lowercase in DB and MD).

**Workflow scope locked:**
- **Leaf project** (no child modules) → runs full 6-stage workflow.
- **Container project** (has child modules) → **no workflow** on project; children are modules.
- **Leaf module** (no child modules) → runs full 6-stage workflow.
- **Container module** (has child modules) → **no workflow** on parent; drill into children.
- **Domain** → never runs workflow (bucket only).
- **Task** → leaf work item; only creatable when parent leaf is in `execute` stage.

#### Stage details

**1. Problem** — Resist solution-thinking. Capture the pain, who feels it, urgency, constraints (time, budget, tech, politics). Start an "explicitly NOT solving" list early.

**2. Shape** — Brainstorm approaches (AI can expand options fast). Compare tradeoffs. Kill bad ideas. Pick one direction. This is where excitement gets channeled into exploration, not execution.

**3. Plan** — High-level how: phases, dependencies, risks, what we're deferring. For software: which systems touched. For renovation: timeline + budget envelope. Not pixel-level detail yet.

**4. Spec** — The AI handoff package. Detailed requirements, acceptance criteria, edge cases, and critically: **how to verify** (tests, manual checks, demo script). A spec without verification is just a prompt — and prompts aren't specs.

**5. Execute** — Tasks only. Each task has a definition of done tied back to spec criteria. Mind map / task list unlocks here. Checklists for multi-step work.

**6. Review** — Did we solve the problem from stage 1? What surprised us? Feed learnings forward. Prevents "shipped and forgot."

#### AI's role per stage (design intent, not v1 feature)

| Stage | AI helps with… | Human must… |
|-------|----------------|-------------|
| Problem | Clarifying questions, reframing | Confirm this is the real problem |
| Shape | Generating options, devil's advocate | Pick the direction |
| Plan | Drafting plan from chosen direction | Approve scope and non-goals |
| Spec | Drafting requirements, suggesting edge cases | Write verification criteria, sign off |
| Execute | Writing code, drafts, research | Verify against spec, mark done |
| Review | Summarizing what happened | Honest assessment |

*Future: inline "draft with AI" in the app. **v1 AI integration:** Cursor skills per stage + session MD import into the app (see Stage AI Sessions below).*

#### Enforcement model (locked)

- **Hard lock:** Only current stage tab is editable. Future stages visible but locked.
- **No tasks before Execute:** Cannot create child task nodes in stages 1–4.
- **Sign-off buttons:** Plan and Spec require explicit "I'm ready to advance" after minimum content.
- **Break-glass:** One override per module to jump to Execute with mandatory reason; flagged on dashboard.
- **Inbox project seed:** Lands at Problem stage; captured text becomes first line of Problem doc.

### Stage gate criteria (decided)

Each stage is **done** when its required sections are filled and the app (or AI session export) marks the checklist complete. Human sign-off required for Plan, Spec, and Review.

#### Problem — done when:

| Section | Required content |
|---------|------------------|
| **Problem statement** | 1–3 sentences: specific pain, not a solution in disguise |
| **Who** | Who experiences this (user, team, household, etc.) |
| **Pain** | Concrete symptoms / evidence (not "it's annoying") |
| **Why now** | Trigger or urgency (ticket count, deadline, event) |
| **Constraints** | At least one real limit (time, budget, tech, politics) |
| **Not solving** | ≥2 explicit out-of-scope items |
| **Sign-off** | You confirm: "This is the problem we're solving" |

**AI facilitator behavior:** Refuse solution-talk until problem is clear. Ask one question at a time. Flag if problem statement smuggles in a chosen approach. Mirror back draft sections for edit.

#### Shape — done when:

| Section | Required content |
|---------|------------------|
| **Options** | ≥3 distinct approaches considered |
| **Tradeoffs** | Pros/cons per option (can be brief) |
| **Killed** | Options explicitly rejected + why |
| **Chosen direction** | One selected approach with rationale |
| **Sign-off** | You confirm: "This is the direction" |

#### Plan — done when:

| Section | Required content |
|---------|------------------|
| **Approach** | How you'll implement the chosen direction |
| **Phases / sequence** | Ordered steps or milestones |
| **Dependencies** | What blocks what (can be "none") |
| **Risks** | ≥1 risk + mitigation |
| **Non-goals** | Reinforced or extended from Problem |
| **Sign-off** | Explicit "Ready for Spec" button |

#### Spec — done when:

| Section | Required content |
|---------|------------------|
| **Requirements** | Concrete must-haves |
| **Acceptance criteria** | Testable conditions (≥3) |
| **Edge cases** | ≥2 things that could go wrong |
| **Verification plan** | How each criterion will be proven (tests, manual steps, demo) |
| **Locked decisions** | Key choices made during spec (for AI/human memory) |
| **Sign-off** | Explicit "Ready for Execute" button |

#### Execute — done when:

All tasks marked complete, each with definition of done tied to a spec criterion.

#### Review — done when:

| Section | Required content |
|---------|------------------|
| **Problem revisited** | Did we solve the original problem? (yes / partial / no) |
| **Surprises** | What we didn't expect |
| **Learnings** | What to do differently next time |
| **Sign-off** | Close module/project |

---

## Stage AI Sessions (Cursor skills + app handoff)

### Problem (locked)

> **Problem:** The enforced workflow creates structured thinking stages, but each stage starts as a blank page with no thinking partner. When tired, I can't write good prompts, so AI doesn't enter the right mindset to guide, challenge, and facilitate. Good conversations happen in Cursor but don't reliably become stage artifacts in the app. Without low-friction guided thinking, the workflow feels like bureaucracy and I cheat the gates.

**Who:** Solo user running multiple life projects with AI-assisted thinking (you).

**Why now:** Six gated stages × many modules = six blank pages each. Workflow only works if starting a stage is *easier* than skipping it.

**Not solving (v1):** In-app chat UI; autonomous stage completion; AI advancing gates without human sign-off.

### Shape: skill architecture (decided)

**Recommendation: C — one skill + app-generated stage prompts**, implemented as a single skill package with per-stage reference files.

```
life-pm/
├── SKILL.md                 # Shared facilitator rules + session MD contract
├── references/
│   ├── problem.md           # Stage-specific mindset + gate checklist
│   ├── shape.md
│   ├── plan.md
│   ├── spec.md
│   ├── execute.md
│   └── review.md
└── examples/
    └── session-export.md    # Example end-of-session output
```

| Option | Verdict | Why |
|--------|---------|-----|
| **A) Six separate skills** | Reject for v1 | Duplicates shared rules (MD format, decision memory, facilitation style). Six names to remember. One change = six files. |
| **B) One skill, stage in argument only** | Reject | `SKILL.md` bloats; stage mindsets are too different to flatten. |
| **C) One skill + app prompts** | **Use this** | Clean split: **app owns context** (project, stage, prior decisions, checklist state); **skill owns behavior** (how to facilitate). One invocation: `@life-pm` + paste app prompt. |

**Session flow:**
1. Open module in app → click **Copy Cursor prompt** on active stage.
2. App emits prompt with `stage: shape`, module metadata, summaries, locked decisions, open questions, checklist state.
3. In Cursor: invoke `life-pm` skill + paste prompt. Skill loads `references/{stage}.md` for stage-specific rules.
4. End of session: skill produces session MD per contract in `SKILL.md`.
5. Import MD into app → updates doc, traffic light, decision log.

**Context delivery (v1):** App-generated prompt paste. **Later:** MCP or deep link that passes module ID automatically.

**Thin alias skills (decided):** Six minimal wrapper skills for ergonomic invocation:

```
~/.cursor/skills/
├── life-pm/                    # Core package (shared rules + references)
├── life-pm-problem/            # Alias → stage: problem
├── life-pm-shape/
├── life-pm-plan/
├── life-pm-spec/
├── life-pm-execute/
└── life-pm-review/
```

Each alias `SKILL.md` is ~15 lines: name, description, pointer to `life-pm/SKILL.md` + `references/{stage}.md`, instruction to wait for pasted app context. No duplicated facilitation rules.

---

### Plan: implementation approach (decided)

**Approach:** Build the **contract first** (session MD format), then the **skill package** (usable immediately with manual context), then the **app handoff** (prompt generator + import parser), then **workflow UI** (stage strip, gates). Skills deliver value before the full app redesign ships.

**Why this order:** You can dogfood `@life-pm-problem` on a real IMS module this week with a hand-typed context block, while app work proceeds in parallel. The MD format is the API between Cursor and the app — lock it early so neither side drifts.

#### Phases / sequence

| Phase | Deliverable | Outcome |
|-------|-------------|---------|
| **P0 — Contract** | Session MD format spec + example files | Skill and app agree on one handoff format |
| **P1 — Skills** | `life-pm` package + 6 alias skills + `problem` + `spec` references first | Guided thinking works in Cursor today |
| **P2 — App parser** | `sessionMdParser`, prompt generator, import dialog (paste MD) | Round-trip without full UI redesign |
| **P3 — Workflow data** | DB fields: `kind`, `workflow_stage`, stage docs, decision log | Modules track stage state |
| **P4 — Module UI** | Stage strip, traffic lights, Copy prompt, Import, Sign-off | First-60-seconds vision |
| **P5 — Gates** | Hard locks, no tasks before Execute, break-glass | Enforcement live |
| **P6 — Portfolio** | Home dashboard shows project/module stage status | Portfolio-at-a-glance |

*P0–P1 can start immediately, no app changes required. P2 depends on P0. P3–P5 are the app workflow slice. P6 ties into broader portfolio redesign.*

#### Phase detail

**P0 — Contract (≈1 session)**
- Write `docs/life-pm/session-md-format.md` — frontmatter schema, required sections per stage, checklist syntax, status values.
- Add `examples/session-export-problem.md` and `examples/session-export-spec.md` as golden files.
- Parser acceptance tests target these examples (written in P2).

**P1 — Skills (≈2–3 sessions)**
- `~/.cursor/skills/life-pm/SKILL.md` — shared facilitator rules, session end protocol, MD export template.
- `references/problem.md` and `references/spec.md` first (highest pain per user).
- Remaining stage references (`shape`, `plan`, `execute`, `review`) — stub with gate checklists, refine through dogfooding.
- Six alias skills under `~/.cursor/skills/life-pm-{stage}/`.
- Dogfood: run one real module (e.g. IMS auth token refresh) through Problem → Shape using aliases.

**P2 — App parser (≈1–2 sessions)**
- `src/lib/life-pm/sessionMdParser.ts` — parse frontmatter + sections → typed `StageSessionImport`.
- `src/lib/life-pm/buildCursorPrompt.ts` — generate kickstart prompt from module context.
- UI: **Import session MD** dialog (textarea paste) on module/detail view — can attach to existing node `description` as interim storage before P3.
- UI: **Copy Cursor prompt** button — copies generated prompt to clipboard.

**P3 — Workflow data (≈1–2 sessions)**
- Migration: extend `nodes` or add `module_stages` table:
  - `kind` enum: `domain | project | module | task`
  - `workflow_stage` enum: `problem | shape | plan | spec | execute | review`
  - Per-stage content: JSONB map `{ problem: html, shape: html, ... }` or child records
  - `decisions` JSONB append-only log
  - `stage_status` per stage: `not_started | in_progress | complete`
- Import writes to correct stage slot + merges decisions.

**P4 — Module UI (≈2–3 sessions)**
- Module dashboard component: stage strip with traffic lights.
- Stage tab view: summary, locked decisions, open questions, TipTap doc, action buttons.
- Read-only access to completed stages; editable = current stage only (soft until P5).

**P5 — Gates (≈1 session)**
- Block task child creation when `workflow_stage` < `execute`.
- Sign-off buttons on Plan, Spec, Review — advance `workflow_stage`, unlock next.
- Break-glass override with reason field, flagged on dashboard.

**P6 — Portfolio (part of broader redesign)**
- Home dashboard cards show current stage + traffic light per active module.
- Domains → projects → modules navigation.

#### Dependencies

```
P0 Contract
 ├──► P1 Skills (needs export format)
 └──► P2 Parser (needs parse format)
       └──► P3 Workflow data (needs import shape)
             └──► P4 Module UI
                   └──► P5 Gates
                         └──► P6 Portfolio

P1 Skills ──► (parallel, no app dependency — dogfood with manual paste)
```

- **P1 does not block on app** — skills are useful standalone.
- **P2 blocks on P0** — can't parse without format.
- **P4 blocks on P3** — UI needs somewhere to store stage docs.
- **Portfolio redesign (P6)** can proceed in parallel with P3–P5 but needs `kind` + `workflow_stage` fields.

#### Risks

| Risk | Mitigation |
|------|------------|
| Session MD format drifts between skill output and app parser | P0 golden examples + parser unit tests; skill `SKILL.md` links to format doc |
| Skill produces prose instead of structured MD | Low-freedom export template in `SKILL.md`; end-of-session protocol: "always emit MD block" |
| TipTap HTML vs Markdown mismatch on import | Parser outputs HTML for TipTap; skill writes Markdown sections; app converts MD→HTML on import |
| Building workflow UI before data model | P3 before P4; P2 interim stores in `description` if needed for early dogfood |
| Scope creep | R1–R7 release plan with explicit non-goals; implement in order |
| Alias skills get out of sync with core skill | Aliases are thin pointers only — all behavior lives in `life-pm/` |
| User skips import after Cursor session | Skill ends with explicit "Copy this MD and import into app" reminder; optional: skill writes file to known path |

#### Non-goals (this plan)

- In-app AI chat or API keys in the app
- MCP auto-context from app to Cursor (v2)
- Full portfolio dashboard (P6 is stub/integration only; full redesign is separate spec)
- Domain/project/module hierarchy migration (parallel track — workflow can attach to existing nodes first with `kind` defaulting to current behavior)
- Auto-advancing gates from AI `status: complete` without human sign-off
- Building all six stage references to perfection before dogfooding Problem + Spec

#### App-generated prompt shape (locked)

The **Copy Cursor prompt** button emits a single paste block:

```markdown
# Life PM session

module_id: <uuid>
module: Token refresh
project: Auth refactor
domain: IMS
stage: problem
workflow_stage_status: in_progress

## Prior summaries
- (none — first session)

## Locked decisions
- (none)

## Open questions
- (none)

## Stage checklist
- [ ] Problem statement
- [ ] Who
- [ ] Pain
- [ ] Why now
- [ ] Constraints
- [ ] Not solving (0/2)
- [ ] Sign-off

## Seed content
> Mobile users lose sessions silently mid-checkout

---
Facilitate the **problem** stage. Follow life-pm skill rules.
```

Skill treats everything above `---` as authoritative context.

#### Sign-off

Plan approved 2026-08-26.

Ready for **Spec** — complete (see `docs/life-pm/session-md-format.md`).

### Spec: session MD format (locked)

**Format version:** `1.0`  
**Spec doc:** [`docs/life-pm/session-md-format.md`](life-pm/session-md-format.md)

Two document types:

| Type | Direction | Purpose |
|------|-----------|---------|
| `session_prompt` | App → Cursor | Copy Cursor prompt kickstart |
| `session_export` | Cursor → App | Import session MD after facilitation |

Golden examples in [`docs/life-pm/examples/`](life-pm/examples/):

- `session-prompt-problem.md`
- `session-export-problem-in-progress.md`
- `session-export-problem-complete.md`
- `session-export-spec.md`

**P0 complete.** **P1 complete** — `life-pm` skill package + 6 aliases in `~/.cursor/skills/`. Next: P2 app parser.

### Solution direction

**Thinking happens in Cursor. Truth lives in the app.**

1. **Cursor skill (`life-pm`)** — Shared facilitator rules + per-stage reference files. Encodes:
   - Stage role / mindset (facilitator, not lecturer)
   - Ongoing facilitation rules (one question at a time, challenge gaps, refuse premature solutions in Problem, etc.)
   - Output contract (structured MD at session end)
   - Kickstart context comes from **app-generated prompt**, not the skill

2. **Session export** — End of every Cursor session, AI produces a **stage session MD** with:
   - Stage name + module/project ID
   - Full artifact content (sections per gate criteria above)
   - **Decisions locked this session** (bullet list)
   - **Open questions** (unresolved)
   - **Stage status:** `complete` | `in_progress` (AI assessment against gate checklist)

3. **App import** — User uploads/pastes session MD (or future: file drop / API). App:
   - Parses into stage TipTap document
   - Updates stage traffic light (🟢 complete / 🟡 in progress / 🔴 not started / ⚪ locked)
   - Stores decision log + summary per stage
   - Unlocks next stage when gate criteria + sign-off met

### App UX (first 60 seconds — decided intent)

When opening a module:

```
┌─────────────────────────────────────────────────────────────┐
│  Token refresh                              IMS › Auth refactor │
├─────────────────────────────────────────────────────────────┤
│  ● Problem  ● Shape  ○ Plan  ○ Spec  ○ Execute  ○ Review    │
│  🟢 done    🟡 wip   ⚪      ⚪     ⚪ locked  ⚪              │
├─────────────────────────────────────────────────────────────┤
│  [Current stage: Shape]                                     │
│                                                             │
│  Summary: Mobile users lose sessions silently…              │
│  Locked decisions: (2) · Open questions: (1)              │
│                                                             │
│  ┌─ Stage document ─────────────────────────────────────┐   │
│  │  (TipTap — imported from last session + editable)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [Copy Cursor prompt]  [Import session MD]  [Sign off →]    │
└─────────────────────────────────────────────────────────────┘
```

- **Traffic lights** on every stage — portfolio and module views show status at a glance.
- **Any stage enterable** for read; only current (and completed) stages editable per lock rules.
- **"Copy Cursor prompt"** — app generates pre-filled kickstart prompt from project context for the active stage (lowers meta-work even before skills exist).
- **Decision log** — persistent, append-only; skills read prior decisions on next session.

### Open questions — resolved

| Question | Decision |
|----------|----------|
| Final stage names | `problem`, `shape`, `plan`, `spec`, `execute`, `review` |
| Review required? | Required to close a **project**; optional for **modules** |
| Project-level workflow? | Container-only when it has modules; otherwise runs workflow |
| Project without modules? | **Yes** — project runs workflow directly |
| Session MD format | `docs/life-pm/session-md-format.md` v1.0 |
| Skill architecture | `life-pm` + app prompts + aliases (P1 done) |
| Context delivery v1 | Copy Cursor prompt paste |
| Build order | R1→R7 (see Agent Implementation Brief) |

---

## Decisions Log

| Date | Decision |
|------|----------|
| 2026-08-26 | Home should be a **portfolio dashboard of active life projects**, not task-first. |
| 2026-08-26 | Keep Inbox quick capture; triage as **todo task** or **project seed**. |
| 2026-08-26 | Enforce a **strict workflow** at project and module level (ideation → … → execution). |
| 2026-08-26 | Hierarchy: **Domain → Project → Module → Task**. |
| 2026-08-26 | Start with enrich-tree (A) + portfolio Home (B); templates later. |
| 2026-08-26 | **Universal pipeline for v1** — same workflow for all domains; content adapts, structure doesn't. |
| 2026-08-26 | Workflow: Problem → Shape → Plan → Spec → Execute → Review. |
| 2026-08-26 | **Stage gate criteria** defined per stage (sections + sign-off). |
| 2026-08-26 | **AI integration v1:** Cursor stage skills + session MD import; not in-app chat. |
| 2026-08-26 | App shows **stage traffic lights**, decision log, summaries; "Copy Cursor prompt" from app. |
| 2026-08-26 | **Skill architecture:** one `life-pm` skill + app prompts + `references/{stage}.md` files. |
| 2026-08-26 | **Thin aliases:** `life-pm-problem` … `life-pm-review` — minimal wrappers, no duplicated rules. |
| 2026-08-26 | **Build order:** P0 contract → P1 skills → P2 parser → P3 data → P4 UI → P5 gates → P6 portfolio. |
| 2026-08-26 | Plan approved. **P0 complete:** session MD format v1.0 + golden examples. |
| 2026-08-26 | **P1 complete:** `~/.cursor/skills/life-pm/` + 6 stage aliases. |
| 2026-08-26 | **UX locked:** Portfolio project cards, Think split layout B, List-default Execute, guided gates. |
| 2026-08-26 | **Nested modules:** unlimited depth; container vs leaf; workflow on leaves only. |
| 2026-08-26 | **Attention module:** one descendant name per project card (muted), priority algorithm defined. |
| 2026-08-26 | Open questions resolved (stage names, review rules, project/module workflow scope). |

---

## Agent Implementation Brief

> **YOU ARE IMPLEMENTING FROM THIS SECTION.**  
> Read Vision/Workflow above for product context. Do not re-debate locked decisions.  
> P0 (session MD) and P1 (Cursor skills) are **done** — implement R1–R7 in order.

### Mission

Overhaul the todo app into **Life PM**: portfolio-first home, domain → project → module → task hierarchy, enforced 6-stage workflow on projects/modules, and Cursor session MD import/export. Preserve single `nodes` tree, existing auth, inbox, lenses, Now/Forgotten, and mind map as a view mode inside projects/modules.

### Strict failure banner

**Do not mark a release complete until every acceptance item for that release passes.** Run `npm test` and relevant `npm run test:e2e` after each release. Fix regressions before proceeding.

### Non-goals (v1 — do not build)

- In-app AI chat or LLM API keys
- MCP / deep-link context to Cursor
- Project templates (renovation vs software scaffolds)
- Kanban board view
- URL routes per place (client `viewMode` + optional `localStorage` persistence is enough for v1)
- Auto-advance workflow gates from AI import without human sign-off click
- Migrating `description` field away — keep for tasks; stage docs live in `stage_docs` JSONB
- Second tasks table

### Prerequisites (already done)

| Item | Location |
|------|----------|
| Session MD format v1.0 | `docs/life-pm/session-md-format.md` |
| Golden examples | `docs/life-pm/examples/*.md` |
| Cursor skills | `~/.cursor/skills/life-pm/` + aliases |

### Locked enums

```typescript
type NodeKind = 'domain' | 'project' | 'module' | 'task'

type PmStatus = 'idea' | 'active' | 'paused' | 'done' | 'archived'

type DomainTag = 'professional' | 'home' | 'business' | 'personal' | 'health' | 'other'

type Health = 'on_track' | 'at_risk' | 'stalled' | 'blocked'

type WorkflowStage = 'problem' | 'shape' | 'plan' | 'spec' | 'execute' | 'review'

type StageStatus = 'not_started' | 'in_progress' | 'complete'
```

### Parent / kind rules (enforce in `createNode`)

| Parent kind | Allowed child kinds |
|-------------|---------------------|
| root (hidden Main) | `domain`, `project` (legacy flat), inbox (system) |
| `domain` | `project` |
| `project` | `module`, `task` (task only if leaf project in `execute`) |
| `module` | `module`, `task` (task only if leaf module in `execute`) |
| `task` | none (leaf) |
| inbox | `task` (triage target) |

**Container detection:** `hasChildModules(node) = children.some(c => c.kind === 'module')`. If true, node is a container — hide workflow UI, show hub.

**Legacy backfill:** existing root children (except inbox) → `kind: 'project'`, `pm_status: 'active'`, `workflow_stage: 'execute'` (grandfathered).

### Data model — migration `005_life_pm.sql`

Add to `public.nodes`:

```sql
kind              TEXT CHECK (kind IN ('domain', 'project', 'module', 'task')),
pm_status         TEXT NOT NULL DEFAULT 'active'
                    CHECK (pm_status IN ('idea', 'active', 'paused', 'done', 'archived')),
outcome           TEXT NOT NULL DEFAULT '',
domain_tag        TEXT CHECK (domain_tag IS NULL OR domain_tag IN (
                    'professional', 'home', 'business', 'personal', 'health', 'other')),
health            TEXT CHECK (health IS NULL OR health IN (
                    'on_track', 'at_risk', 'stalled', 'blocked')),
workflow_stage    TEXT CHECK (workflow_stage IS NULL OR workflow_stage IN (
                    'problem', 'shape', 'plan', 'spec', 'execute', 'review')),
stage_status      JSONB NOT NULL DEFAULT '{}',
stage_docs        JSONB NOT NULL DEFAULT '{}',
stage_summaries   JSONB NOT NULL DEFAULT '{}',
decisions         JSONB NOT NULL DEFAULT '[]',
open_questions    JSONB NOT NULL DEFAULT '[]',
break_glass       JSONB
```

**`stage_status` shape:** `{ "problem": "complete", "shape": "in_progress", ... }`  
**`stage_docs` shape:** `{ "problem": "<html>", "shape": "<html>", ... }` — TipTap HTML per stage  
**`decisions` shape:** `[{ "date": "2026-08-26", "text": "..." }]`  
**`break_glass` shape:** `{ "used": true, "reason": "...", "at": "ISO8601" }` — one per project/module

**Backfill migration SQL (same file):**
```sql
UPDATE nodes SET
  kind = 'project',
  pm_status = 'active',
  workflow_stage = 'execute',
  stage_status = jsonb_build_object(
    'problem','complete','shape','complete','plan','complete',
    'spec','complete','execute','in_progress','review','not_started'
  )
WHERE parent_id = (SELECT id FROM nodes WHERE parent_id IS NULL AND system_role IS NULL LIMIT 1)
  AND system_role IS NULL
  AND kind IS NULL;
```

### Files to create

| Path | Purpose |
|------|---------|
| `supabase/migrations/005_life_pm.sql` | Schema above |
| `src/lib/life-pm/types.ts` | Shared Life PM types |
| `src/lib/life-pm/sessionMdParser.ts` | Parse `session_export` MD |
| `src/lib/life-pm/sessionMdParser.test.ts` | Tests against golden examples |
| `src/lib/life-pm/buildCursorPrompt.ts` | Generate `session_prompt` MD |
| `src/lib/life-pm/buildCursorPrompt.test.ts` | Prompt generation tests |
| `src/lib/life-pm/markdownToHtml.ts` | MD sections → TipTap HTML (use marked or similar if already in deps; else minimal converter) |
| `src/lib/life-pm/workflowModel.ts` | Stage order, gate checks, sign-off rules, `canCreateTask()` |
| `src/lib/life-pm/workflowModel.test.ts` | Pure function tests |
| `src/lib/portfolio/portfolioModel.ts` | Group projects, `pickAttentionModule()`, domain sections |
| `src/lib/portfolio/portfolioModel.test.ts` | Portfolio + attention pick tests |
| `src/components/portfolio/PortfolioDashboard.tsx` | Home portfolio view |
| `src/components/portfolio/ProjectCard.tsx` | Project card per UX spec |
| `src/components/portfolio/ModuleHub.tsx` | Container project/module child grid |
| `src/components/workflow/ModuleDashboard.tsx` | Leaf Think/Do dashboard (split layout) |
| `src/components/workflow/StageStrip.tsx` | Traffic lights + stage tabs |
| `src/components/workflow/StageChecklist.tsx` | Left column checklist (Think mode) |
| `src/components/workflow/StageDocument.tsx` | TipTap editor for one stage doc |
| `src/components/workflow/ImportSessionDialog.tsx` | Paste MD → import |
| `src/components/workflow/SignOffButton.tsx` | Advance stage gate |
| `src/components/workflow/BreakGlassDialog.tsx` | Override to execute |

### Files to modify

| Path | Changes |
|------|---------|
| `src/types/index.ts` | Add PM fields to `NodeRecord`, payloads |
| `src/lib/supabase/queries.ts` | Read/write new columns |
| `src/lib/store/useNodeStore.ts` | `createNode` kind validation, `importSessionMd()`, workflow helpers |
| `src/lib/store/useUIStore.ts` | `viewMode: 'portfolio' \| 'hub' \| 'think' \| 'map' \| 'list'` |
| `src/components/place/PlaceScreen.tsx` | Route root → Portfolio; container → ModuleHub; leaf → ModuleDashboard |
| `src/components/canvas/CanvasToolbar.tsx` | Kind-aware create; block tasks pre-execute |
| `src/components/panel/NodeDetailForm.tsx` | Show outcome, pm_status, domain_tag for PM kinds |
| `src/components/capture/QuickCaptureDialog.tsx` | Triage: todo task vs project seed |
| `src/components/place/InboxList.tsx` | "Promote to project" action |
| `src/components/place/PlaceBreadcrumb.tsx` | Kind-aware labels |
| `tests/e2e/helpers.ts` | Seed nodes with `kind` fields |

### Release plan (implement in order)

---

#### R1 — Data foundation

**Goal:** DB + types + workflow pure functions. No UI yet.

**Tasks:**
1. Write `005_life_pm.sql` with backfill.
2. Extend `NodeRecord` and query layer.
3. Implement `workflowModel.ts`: `STAGE_ORDER`, `nextStage()`, `canEditStage()`, `canCreateTask()`, `canSignOff()`, `trafficLight()`.
4. Unit tests for `workflowModel`.

**Acceptance:**
- [ ] A1: Migration applies cleanly on fresh DB and existing DB
- [ ] A2: `NodeRecord` includes all PM fields
- [ ] A3: `canCreateTask(parent)` returns false when `workflow_stage` is before `execute`
- [ ] A4: `npm test` passes

---

#### R2 — Session MD round-trip (P2)

**Goal:** Parser + prompt builder + tests. No UI required but export types used by R4.

**Tasks:**
1. `sessionMdParser.ts` — parse golden files from `docs/life-pm/examples/`.
2. `buildCursorPrompt.ts` — emit `session_prompt` per spec.
3. `markdownToHtml.ts` — convert section bodies for `stage_docs`.
4. `useNodeStore.importSessionMd(nodeId, rawMd)` — parse, merge `stage_docs`, `stage_summaries`, `decisions`, `open_questions`, `stage_status`.

**Acceptance:**
- [ ] B1: Parser round-trips `session-export-problem-complete.md` without error
- [ ] B2: Parser round-trips `session-export-spec.md` without error
- [ ] B3: Invalid MD returns structured parse errors
- [ ] B4: `buildCursorPrompt` output matches `session-prompt-problem.md` structure
- [ ] B5: Import sets `stage_status` from export `status` field
- [ ] B6: `npm test` passes

---

#### R3 — Leaf dashboard + hubs (P4)

**Goal:** Think mode split layout, container hubs, Copy prompt, Import.

**Tasks:**
1. `viewMode`: `portfolio` | `hub` | `think` | `map` | `list`.
2. `ModuleHub.tsx` — direct child module cards for container project/module.
3. `ModuleDashboard.tsx` — Think: `StageChecklist` + `StageDocument` split; stage strip on top.
4. `ImportSessionDialog`, Copy prompt, `SignOffButton`, `BreakGlassDialog`.
5. Route: container → hub; leaf → think (or list if execute).

**Acceptance:**
- [ ] C1: Leaf module shows split checklist + doc (layout B)
- [ ] C2: Container project shows module hub, no stage strip
- [ ] C3: Nested module hub drills deeper (Auth → Token refresh)
- [ ] C4: Copy / Import round-trip works
- [ ] C5: Sign-off advances stage; locked stages read-only
- [ ] C6: `npm test` passes

---

#### R4 — Workflow gates (P5)

**Goal:** Hard enforcement.

**Tasks:**
1. `createNode` / `CanvasToolbar` / Tab shortcut — reject task creation when `!canCreateTask(parent)`.
2. Sign-off required for `plan`, `spec`; optional skip `review` for modules.
3. `BreakGlassDialog` — sets `break_glass`, jumps to `execute`, shows flag on dashboard.
4. Inbox promote → new project/module at `workflow_stage: 'problem'`, seed in `stage_docs.problem`.

**Acceptance:**
- [ ] D1: Cannot create child task on module in `problem` stage (UI disabled + store rejects)
- [ ] D2: Can create tasks when module in `execute` stage
- [ ] D3: Break-glass shows warning badge on module card
- [ ] D4: Inbox "Promote to project" creates project at `problem` with seed text
- [ ] D5: E2E: `tests/e2e/workflow-gates.spec.ts` covers task block + promote
- [ ] D6: `npm test` and `npm run test:e2e` pass

---

#### R5 — Portfolio home (P6)

**Goal:** App opens to portfolio card grid; project cards per UX spec.

**Tasks:**
1. `portfolioModel.ts` — `activeProjects()`, `groupByDomain()`, `pickAttentionModule()`.
2. `PortfolioDashboard.tsx` + `ProjectCard.tsx` (attention line: module title only).
3. Root → `PortfolioDashboard`; Inbox slide-over in header.
4. Lenses in portfolio toolbar (Do overlay).

**Acceptance:**
- [ ] E1: `/map` shows project card grid, not canvas
- [ ] E2: Project card shows ≤1 attention module name (muted) when applicable
- [ ] E3: Click project → project hub
- [ ] E4: Inbox + `C` work from portfolio
- [ ] E5: E2E `tests/e2e/portfolio-home.spec.ts`
- [ ] E6: Tests pass

---

#### R6 — Kind-aware creation & nested modules

**Goal:** Domain → project → module (recursive) creation UX.

**Tasks:**
1. Create: Add domain, project, module/submodule (parent-aware).
2. Enforce parent/kind rules; container vs leaf routing.
3. `PlaceBreadcrumb` — full nested chain.
4. `NodeDetailForm` — outcome, pm_status, domain_tag, health on projects/modules.

**Acceptance:**
- [ ] F1: `project → module → module → module` chain works
- [ ] F2: Adding child module to leaf converts parent to container (workflow archived or warned — see note below)
- [ ] F3: Invalid parent/kind rejected
- [ ] F4: Breadcrumb shows full depth
- [ ] F5: `npm test` passes

**Note — leaf becomes container:** If user adds a child module to a leaf that already has workflow progress, prompt: "This module will become a grouping folder; workflow moves to children." v1: block if stage past `problem`, or require confirm.

---

#### R7 — Polish & regression

**Tasks:**
1. Update existing e2e tests for portfolio-first home (adjust navigation helpers).
2. Update `README.md` feature list.
3. Forgotten/Now scoped to portfolio cards and module overview sidebar.
4. Persist `viewMode` + `currentPlaceId` to `localStorage` (optional but recommended).

**Acceptance:**
- [ ] G1: All existing e2e tests pass or are intentionally updated with justification
- [ ] G2: Full `npm test` + `npm run test:e2e` green
- [ ] G3: README documents Life PM workflow

---

### UI wireframes (reference)

**Portfolio home (root):**
```
┌─────────────────────────────────────────────────────────────┐
│  Life PM                              [Inbox (3)] [⌘K] [C]  │
├─────────────────────────────────────────────────────────────┤
│  Active                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ IMS › Auth refactor│  │ Home › Flooring  │                 │
│  │ 🟡 Shape · Active  │  │ 🟢 Execute       │                 │
│  │ Token refresh…     │  │ Install week 3   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  Paused · Ideas · Done (collapsed sections)                  │
└─────────────────────────────────────────────────────────────┘
```

**Module dashboard:** see [App UX](#app-ux-first-60-seconds--decided-intent) section above.

### Verification commands

```bash
npm test
npm run test:e2e          # requires E2E_USER_EMAIL, E2E_USER_PASSWORD, Supabase env
npm run build             # static export must succeed
```

### Agent workflow

1. Read this brief + `docs/life-pm/session-md-format.md`.
2. Implement **R1** only → run tests → stop for review (or continue if unattended).
3. Proceed R2→R7 in order; do not skip releases.
4. Match existing code style (Zustand stores, Shadcn UI, colocated tests).
5. Minimize scope — no templates, no kanban, no in-app AI.

### Reference docs

| Doc | Path |
|-----|------|
| Session MD format | `docs/life-pm/session-md-format.md` |
| Place-based map (prior art) | `docs/superpowers/specs/2026-08-18-place-based-life-map-design.md` |
| Life OS enhancements | `docs/superpowers/specs/2026-08-24-life-os-enhancements-design.md` |

---

## Next Steps (human)

1. ~~P0 — Session MD format~~ → done
2. ~~P1 — Cursor skills~~ → done
3. **Feed this doc to an implementing agent** — start at R1
4. Dogfood `@life-pm-problem` while R2–R3 ship
