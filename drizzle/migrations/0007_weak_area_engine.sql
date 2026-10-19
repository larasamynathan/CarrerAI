ALTER TABLE public.weak_areas
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS trend text,
  ADD COLUMN IF NOT EXISTS attention text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS recommended_action text,
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS weak_areas_engine_topic_uq ON public.weak_areas(user_id, topic) WHERE source = 'engine';
ALTER TABLE public.assessment_questions ADD COLUMN IF NOT EXISTS subtopic text;
GRANT SELECT (subtopic) ON public.assessment_questions TO authenticated;