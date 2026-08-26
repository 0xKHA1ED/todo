# Life PM — Session MD Format Spec

**Format version:** `1.0`  
**Status:** Locked for P0 (2026-08-26)

This document is the contract between:

- **App → Cursor:** session prompt (kickstart context)
- **Cursor → App:** session export (stage artifact + metadata)

Both use Markdown with YAML frontmatter. The app parser (`sessionMdParser`) and `life-pm` Cursor skill MUST conform to this spec.

---

## Format overview

| Document | `type` in frontmatter | Direction | Purpose |
|----------|----------------------|-----------|---------|
| Session prompt | `session_prompt` | App → Cursor | Kickstart a facilitation session |
| Session export | `session_export` | Cursor → App | Import stage artifact + update traffic lights |

**Stage enum (lowercase):** `problem` | `shape` | `plan` | `spec` | `execute` | `review`

**Status enum:** `not_started` | `in_progress` | `complete`

---

## Shared frontmatter fields

All documents MUST start with YAML frontmatter delimited by `---`.

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `life_pm_format` | yes | string | Format version. Current: `"1.0"` |
| `type` | yes | string | `session_prompt` or `session_export` |
| `module_id` | yes | string (UUID) | Node ID of the module |
| `module` | yes | string | Module display title |
| `project` | yes | string | Parent project title |
| `domain` | yes | string | Domain title (e.g. IMS) |
| `stage` | yes | string | One of the stage enum values |

### `session_export` only

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `status` | yes | string | `not_started` \| `in_progress` \| `complete` |
| `session_date` | yes | string | ISO date `YYYY-MM-DD` |
| `sign_off` | yes | boolean | `true` only when user explicitly confirmed stage completion in session |
| `summary` | no | string | One-line summary for portfolio / stage strip |

### `session_prompt` only

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `workflow_stage_status` | yes | string | Current stage status before this session |

---

## Section heading rules

- Stage artifact sections use `## Heading` (H2) with **exact titles** listed below (case-sensitive).
- Meta sections at the end of every export use fixed H2 titles: `Locked decisions`, `Open questions`, `Stage checklist`.
- Body content under each section is Markdown (paragraphs, lists, tables). The app converts Markdown → HTML for TipTap on import.
- Empty sections MUST still be present in exports with `(none)` or a single `-` bullet to indicate intentionally empty.

---

## Session prompt (app → Cursor)

Emitted by **Copy Cursor prompt**. User pastes into Cursor after invoking `@life-pm` or `@life-pm-{stage}`.

### Template

```markdown
---
life_pm_format: "1.0"
type: session_prompt
module_id: <uuid>
module: <title>
project: <title>
domain: <title>
stage: <stage>
workflow_stage_status: <not_started|in_progress|complete>
---

# Life PM session

## Prior summaries

- **problem:** …
- **shape:** …

## Locked decisions

- 2026-08-20 — Use refresh tokens, not session extension

## Open questions

- Does this affect native app or web only?

## Stage checklist

(checklist items for current stage — see per-stage tables below)

## Seed content

> Optional inbox seed or prior notes

---

Facilitate the **{stage}** stage. Follow life-pm skill rules. End session with a `session_export` MD block per `docs/life-pm/session-md-format.md`.
```

### Parser notes (prompt)

- Prompt is **read by the skill**, not imported by the app.
- `## Prior summaries` lists one bullet per completed prior stage with a bold stage name prefix.
- `## Stage checklist` reflects current completion state from the app (`[x]` / `[ ]`).

---

## Session export (Cursor → app)

Produced at **end of every facilitation session**. User imports via **Import session MD** in the app.

### Document structure

```
---
frontmatter
---

## Summary                    (optional but recommended)

{stage-specific sections}     (ordered per stage table below)

## Locked decisions           (required — meta)
## Open questions             (required — meta)
## Stage checklist            (required — meta)
```

### Status derivation

| `status` in frontmatter | When to set |
|-------------------------|-------------|
| `in_progress` | Some checklist items checked, or sign-off not done |
| `complete` | All required checklist items `[x]` AND `sign_off: true` |
| `not_started` | Rare on export; only if session made no progress |

**App rule:** Importing `complete` does NOT auto-advance `workflow_stage`. User must click **Sign off →** in app (or sign-off is part of import confirmation UI). `sign_off: true` in export pre-checks the sign-off requirement but human confirmation in app is still required for Plan, Spec, Review.

### Import behavior

On successful parse:

1. Write stage-specific sections → stage TipTap document for `stage`.
2. Append `## Locked decisions` bullets to module `decisions` log (dedupe by exact text).
3. Replace module `open_questions` with export list.
4. Set stage traffic light from `status`.
5. Store `summary` on stage record if present.

Parse errors MUST show which section/field failed.

---

## Per-stage sections

### `problem`

| Section (H2) | Required for complete | Gate |
|----------------|----------------------|------|
| Problem statement | yes | Non-empty, not solution-disguised |
| Who | yes | Non-empty |
| Pain | yes | Concrete evidence |
| Why now | yes | Non-empty |
| Constraints | yes | ≥1 constraint |
| Not solving | yes | ≥2 items |
| Sign-off | yes | Checkbox `[x]` + `sign_off: true` |

**Stage checklist items (exact labels):**

```
- [ ] Problem statement
- [ ] Who
- [ ] Pain
- [ ] Why now
- [ ] Constraints
- [ ] Not solving (min 2)
- [ ] Sign-off
```

### `shape`

| Section (H2) | Required for complete |
|----------------|----------------------|
| Options | ≥3 options |
| Tradeoffs | Non-empty |
| Killed | ≥1 rejected option with reason |
| Chosen direction | One selected approach |
| Sign-off | `[x]` + `sign_off: true` |

**Checklist:**

```
- [ ] Options (min 3)
- [ ] Tradeoffs
- [ ] Killed
- [ ] Chosen direction
- [ ] Sign-off
```

### `plan`

| Section (H2) | Required for complete |
|----------------|----------------------|
| Approach | Non-empty |
| Phases | Ordered list, non-empty |
| Dependencies | Non-empty (may be "none") |
| Risks | ≥1 risk with mitigation |
| Non-goals | Non-empty |
| Sign-off | `[x]` + `sign_off: true` |

**Checklist:**

```
- [ ] Approach
- [ ] Phases
- [ ] Dependencies
- [ ] Risks
- [ ] Non-goals
- [ ] Sign-off
```

### `spec`

| Section (H2) | Required for complete |
|----------------|----------------------|
| Requirements | Non-empty |
| Acceptance criteria | ≥3 testable items |
| Edge cases | ≥2 items |
| Verification plan | Maps criteria → proof method |
| Sign-off | `[x]` + `sign_off: true` |

Note: Spec-stage locked decisions go in the meta `## Locked decisions` section (appended to log), not a separate artifact section.

**Checklist:**

```
- [ ] Requirements
- [ ] Acceptance criteria (min 3)
- [ ] Edge cases (min 2)
- [ ] Verification plan
- [ ] Sign-off
```

### `execute`

| Section (H2) | Required for complete |
|----------------|----------------------|
| Tasks | Task list with definition of done |
| Progress | Summary of what's done vs remaining |
| Sign-off | N/A — complete when all tasks done in app |

Execute sessions update task list content; stage `complete` when all child tasks marked done in app (not only via export).

**Checklist:**

```
- [ ] Tasks documented
- [ ] Each task has definition of done
- [ ] Tasks linked to spec criteria (where applicable)
```

### `review`

| Section (H2) | Required for complete |
|----------------|----------------------|
| Problem revisited | `yes` \| `partial` \| `no` |
| Surprises | Non-empty |
| Learnings | Non-empty |
| Sign-off | `[x]` + `sign_off: true` |

**Checklist:**

```
- [ ] Problem revisited
- [ ] Surprises
- [ ] Learnings
- [ ] Sign-off
```

---

## Meta sections (all exports)

### `## Locked decisions`

Bullet list of decisions locked **this session**. Format:

```markdown
- YYYY-MM-DD — Decision text
```

App appends to module decision log. Prior decisions are NOT repeated unless amended (use "Amends: …" prefix).

### `## Open questions`

```markdown
- Unresolved question
```

`(none)` if empty.

### `## Stage checklist`

Markdown checkboxes. Labels MUST match the stage's checklist above. Parser counts `[x]` vs `[ ]` for validation.

---

## Validation rules

### Export validation (parser)

| Rule | Severity |
|------|----------|
| Valid YAML frontmatter | error |
| `life_pm_format` supported (1.0) | error |
| `module_id` is UUID | error |
| `stage` is valid enum | error |
| All required H2 sections for stage present | error |
| `status: complete` but checklist incomplete | warning (downgrade to `in_progress`) |
| `sign_off: true` but Sign-off not `[x]` | warning (treat `sign_off` as false) |
| Unknown H2 section | warning (ignore) |

### Skill validation (life-pm)

At session end, skill MUST:

1. Emit export inside a single fenced `markdown` code block OR as the final message artifact.
2. Include all required sections for the active stage.
3. Set `status` honestly against checklist.
4. Remind user: **Import this MD into the Life PM app.**

---

## Versioning

- Bump `life_pm_format` minor for additive changes (new optional fields).
- Bump major for breaking changes (renamed sections, removed fields).
- Parser supports all versions listed in `SUPPORTED_FORMAT_VERSIONS` constant.

---

## File references

| File | Purpose |
|------|---------|
| [examples/session-export-problem-in-progress.md](./examples/session-export-problem-in-progress.md) | Golden: problem stage, in progress |
| [examples/session-export-problem-complete.md](./examples/session-export-problem-complete.md) | Golden: problem stage, complete |
| [examples/session-export-spec.md](./examples/session-export-spec.md) | Golden: spec stage |
| [examples/session-prompt-problem.md](./examples/session-prompt-problem.md) | Golden: app-generated prompt |

---

## TypeScript types (for P2 parser)

```typescript
type LifePmStage =
  | "problem" | "shape" | "plan" | "spec" | "execute" | "review";

type LifePmStatus = "not_started" | "in_progress" | "complete";

type SessionExport = {
  lifePmFormat: "1.0";
  type: "session_export";
  moduleId: string;
  module: string;
  project: string;
  domain: string;
  stage: LifePmStage;
  status: LifePmStatus;
  sessionDate: string;
  signOff: boolean;
  summary?: string;
  sections: Record<string, string>; // H2 title → markdown body
  lockedDecisions: string[];
  openQuestions: string[];
  checklist: { label: string; checked: boolean }[];
};
```
