CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  horizon_days integer NOT NULL CHECK (horizon_days IN (7, 30)),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, horizon_days)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmaps TO authenticated;
GRANT ALL ON public.roadmaps TO service_role;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own roadmaps" ON public.roadmaps FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  week integer NOT NULL DEFAULT 1,
  day integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  topic text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  estimated_minutes integer NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  reason text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX roadmap_tasks_roadmap_idx ON public.roadmap_tasks (roadmap_id, day, position);
CREATE INDEX roadmap_tasks_user_idx ON public.roadmap_tasks (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_tasks TO authenticated;
GRANT ALL ON public.roadmap_tasks TO service_role;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own roadmap tasks" ON public.roadmap_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.roadmaps r WHERE r.id = roadmap_id AND r.user_id = auth.uid()));