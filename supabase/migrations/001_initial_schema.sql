CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Task',
  urgency     TEXT NOT NULL DEFAULT 'normal'
                CHECK (urgency IN ('low', 'normal', 'high')),
  date        DATE,
  tags        TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  position_x  FLOAT DEFAULT 0,
  position_y  FLOAT DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON public.nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user_id ON public.nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_tags ON public.nodes USING GIN(tags);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.nodes;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nodes" ON public.nodes;
CREATE POLICY "Users can view own nodes"
  ON public.nodes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own nodes" ON public.nodes;
CREATE POLICY "Users can insert own nodes"
  ON public.nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own nodes" ON public.nodes;
CREATE POLICY "Users can update own nodes"
  ON public.nodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own nodes" ON public.nodes;
CREATE POLICY "Users can delete own nodes"
  ON public.nodes FOR DELETE
  USING (auth.uid() = user_id);
