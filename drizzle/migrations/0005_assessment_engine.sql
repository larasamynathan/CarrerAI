ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS question_count integer,
  ADD COLUMN IF NOT EXISTS time_limit_seconds integer,
  ADD COLUMN IF NOT EXISTS time_taken_seconds integer,
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS correct integer,
  ADD COLUMN IF NOT EXISTS incorrect integer,
  ADD COLUMN IF NOT EXISTS unanswered integer,
  ADD COLUMN IF NOT EXISTS accuracy integer,
  ADD COLUMN IF NOT EXISTS time_efficiency integer,
  ADD COLUMN IF NOT EXISTS topic_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assessment_answers ADD COLUMN IF NOT EXISTS marked_for_review boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS assessment_questions_assessment_idx ON public.assessment_questions(assessment_id, position);
CREATE INDEX IF NOT EXISTS assessment_results_assessment_idx ON public.assessment_results(assessment_id);

-- Correct answers and explanations are hidden from students; graded server-side only.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions FROM authenticated, anon;
GRANT SELECT (id, assessment_id, user_id, position, question, options, topic, created_at) ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
-- Scores are written only by the grading server function, so students cannot forge results.
REVOKE INSERT, UPDATE ON public.assessment_results FROM authenticated, anon;
GRANT ALL ON public.assessment_results TO service_role;
REVOKE UPDATE (is_correct) ON public.assessment_answers FROM authenticated;
GRANT ALL ON public.assessment_answers TO service_role;
REVOKE UPDATE (score, correct, incorrect, unanswered, accuracy, time_efficiency, topic_breakdown, time_taken_seconds, completed_at, status) ON public.assessments FROM authenticated;
GRANT ALL ON public.assessments TO service_role;