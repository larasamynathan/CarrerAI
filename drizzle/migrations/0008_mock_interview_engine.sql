ALTER TABLE public.mock_interviews
  ADD COLUMN IF NOT EXISTS question_count integer,
  ADD COLUMN IF NOT EXISTS seconds_per_question integer,
  ADD COLUMN IF NOT EXISTS current_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.mock_interview_questions
  ADD COLUMN IF NOT EXISTS focus text,
  ADD COLUMN IF NOT EXISTS question_key text,
  ADD COLUMN IF NOT EXISTS evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS time_taken_seconds integer,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS mock_interview_questions_unique_key ON public.mock_interview_questions (mock_interview_id, question_key) WHERE question_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mock_interview_questions_unique_pos ON public.mock_interview_questions (mock_interview_id, position);
-- Interview writes and scoring happen only in authenticated server functions.
REVOKE INSERT, UPDATE ON public.mock_interviews FROM authenticated;
REVOKE INSERT, UPDATE ON public.mock_interview_questions FROM authenticated;
GRANT ALL ON public.mock_interviews TO service_role;
GRANT ALL ON public.mock_interview_questions TO service_role;