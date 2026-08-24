ALTER TABLE public.nodes
ADD COLUMN IF NOT EXISTS system_role TEXT
  CHECK (system_role IS NULL OR system_role = 'inbox');

CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_user_inbox
  ON public.nodes (user_id)
  WHERE system_role = 'inbox';