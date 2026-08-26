-- Life PM: enrich nodes with portfolio / workflow fields.
-- Existing root children (except inbox) are grandfathered as active projects in Execute.

ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS kind TEXT
    CHECK (kind IS NULL OR kind IN ('domain', 'project', 'module', 'task')),
  ADD COLUMN IF NOT EXISTS pm_status TEXT NOT NULL DEFAULT 'active'
    CHECK (pm_status IN ('idea', 'active', 'paused', 'done', 'archived')),
  ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain_tag TEXT
    CHECK (domain_tag IS NULL OR domain_tag IN (
      'professional', 'home', 'business', 'personal', 'health', 'other')),
  ADD COLUMN IF NOT EXISTS health TEXT
    CHECK (health IS NULL OR health IN (
      'on_track', 'at_risk', 'stalled', 'blocked')),
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT
    CHECK (workflow_stage IS NULL OR workflow_stage IN (
      'problem', 'shape', 'plan', 'spec', 'execute', 'review')),
  ADD COLUMN IF NOT EXISTS stage_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_docs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_summaries JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS break_glass JSONB;

CREATE INDEX IF NOT EXISTS idx_nodes_kind ON public.nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_workflow_stage ON public.nodes(workflow_stage);

-- Grandfather existing Home children (except inbox) as active projects already in Execute.
UPDATE public.nodes SET
  kind = 'project',
  pm_status = 'active',
  workflow_stage = 'execute',
  stage_status = jsonb_build_object(
    'problem', 'complete',
    'shape', 'complete',
    'plan', 'complete',
    'spec', 'complete',
    'execute', 'in_progress',
    'review', 'not_started'
  )
WHERE parent_id IN (
    SELECT id FROM public.nodes WHERE parent_id IS NULL AND system_role IS NULL
  )
  AND system_role IS NULL
  AND kind IS NULL;

-- Nested unlabeled nodes become tasks so the tree is kind-complete after backfill.
UPDATE public.nodes SET kind = 'task'
WHERE kind IS NULL
  AND parent_id IS NOT NULL
  AND system_role IS NULL
  AND parent_id NOT IN (
    SELECT id FROM public.nodes WHERE parent_id IS NULL AND system_role IS NULL
  );
