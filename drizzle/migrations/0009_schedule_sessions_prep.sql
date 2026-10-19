ALTER TABLE public.scheduled_sessions
  ADD COLUMN IF NOT EXISTS session_type text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.scheduled_sessions ALTER COLUMN company SET DEFAULT '';
ALTER TABLE public.scheduled_sessions ALTER COLUMN role SET DEFAULT '';
CREATE INDEX IF NOT EXISTS scheduled_sessions_user_time ON public.scheduled_sessions (user_id, scheduled_at);