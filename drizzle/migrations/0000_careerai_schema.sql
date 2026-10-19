
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  college text,
  degree text,
  branch text,
  graduation_year integer CHECK (graduation_year BETWEEN 1950 AND 2100),
  target_role text NOT NULL DEFAULT 'Software Engineer',
  target_company text NOT NULL DEFAULT '',
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  proficiency integer NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own skills" ON public.skills FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER skills_updated BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessments_user_idx ON public.assessments (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessments" ON public.assessments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  explanation text,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_questions_assessment_idx ON public.assessment_questions (assessment_id, position);
CREATE INDEX assessment_questions_user_idx ON public.assessment_questions (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessment questions" ON public.assessment_questions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE TABLE public.assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  selected_answer text,
  is_correct boolean,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
CREATE INDEX assessment_answers_assessment_idx ON public.assessment_answers (assessment_id);
CREATE INDEX assessment_answers_user_idx ON public.assessment_answers (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_answers TO authenticated;
GRANT ALL ON public.assessment_answers TO service_role;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessment answers" ON public.assessment_answers FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  topic text NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_results_user_idx ON public.assessment_results (user_id, created_at DESC);
CREATE INDEX assessment_results_assessment_idx ON public.assessment_results (assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessment results" ON public.assessment_results FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (assessment_id IS NULL OR EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())));

CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  topic text NOT NULL,
  session_type text NOT NULL DEFAULT 'practice',
  duration_minutes integer CHECK (duration_minutes >= 0),
  score integer CHECK (score BETWEEN 0 AND 100),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_sessions_user_idx ON public.practice_sessions (user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own practice sessions" ON public.practice_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role text NOT NULL,
  company text,
  interview_type text NOT NULL DEFAULT 'technical',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  feedback text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mock_interviews_user_idx ON public.mock_interviews (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_interviews TO authenticated;
GRANT ALL ON public.mock_interviews TO service_role;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mock interviews" ON public.mock_interviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.mock_interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_interview_id uuid NOT NULL REFERENCES public.mock_interviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  answer text,
  feedback text,
  score integer CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mock_interview_questions_interview_idx ON public.mock_interview_questions (mock_interview_id, position);
CREATE INDEX mock_interview_questions_user_idx ON public.mock_interview_questions (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_interview_questions TO authenticated;
GRANT ALL ON public.mock_interview_questions TO service_role;
ALTER TABLE public.mock_interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mock interview questions" ON public.mock_interview_questions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.mock_interviews m WHERE m.id = mock_interview_id AND m.user_id = auth.uid()));

CREATE TABLE public.resume_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'My resume',
  file_path text,
  raw_text text,
  parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_profiles_user_idx ON public.resume_profiles (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_profiles TO authenticated;
GRANT ALL ON public.resume_profiles TO service_role;
ALTER TABLE public.resume_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own resumes" ON public.resume_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER resume_profiles_updated BEFORE UPDATE ON public.resume_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.resume_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_profile_id uuid NOT NULL REFERENCES public.resume_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  summary text,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_analysis_resume_idx ON public.resume_analysis (resume_profile_id, created_at DESC);
CREATE INDEX resume_analysis_user_idx ON public.resume_analysis (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_analysis TO authenticated;
GRANT ALL ON public.resume_analysis TO service_role;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own resume analysis" ON public.resume_analysis FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.resume_profiles r WHERE r.id = resume_profile_id AND r.user_id = auth.uid()));

CREATE TABLE public.weak_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  topic text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  source text NOT NULL DEFAULT 'assessment',
  notes text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX weak_areas_user_idx ON public.weak_areas (user_id, resolved);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weak_areas TO authenticated;
GRANT ALL ON public.weak_areas TO service_role;
ALTER TABLE public.weak_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own weak areas" ON public.weak_areas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER weak_areas_updated BEFORE UPDATE ON public.weak_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  weak_area_id uuid REFERENCES public.weak_areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  priority integer NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  link text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recommendations_user_idx ON public.recommendations (user_id, status, priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recommendations" ON public.recommendations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (weak_area_id IS NULL OR EXISTS (SELECT 1 FROM public.weak_areas w WHERE w.id = weak_area_id AND w.user_id = auth.uid())));

CREATE TABLE public.preparation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  notes text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX preparation_plans_user_idx ON public.preparation_plans (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_plans TO authenticated;
GRANT ALL ON public.preparation_plans TO service_role;
ALTER TABLE public.preparation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own plans" ON public.preparation_plans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER preparation_plans_updated BEFORE UPDATE ON public.preparation_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  company text NOT NULL,
  role text NOT NULL,
  round_type text NOT NULL DEFAULT 'Technical',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'Scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scheduled_sessions_user_idx ON public.scheduled_sessions (user_id, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_sessions TO authenticated;
GRANT ALL ON public.scheduled_sessions TO service_role;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own scheduled sessions" ON public.scheduled_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER scheduled_sessions_updated BEFORE UPDATE ON public.scheduled_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text,
  category text NOT NULL DEFAULT 'General',
  resource_type text NOT NULL DEFAULT 'article',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resources_category_idx ON public.resources (category);
GRANT SELECT ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read resources" ON public.resources FOR SELECT TO authenticated USING (true);

CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_sessions_user_idx ON public.chat_sessions (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chat sessions" ON public.chat_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER chat_sessions_updated BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_idx ON public.chat_messages (session_id, created_at);
CREATE INDEX chat_messages_user_idx ON public.chat_messages (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chat messages" ON public.chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  source text,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_documents_user_idx ON public.knowledge_documents (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own knowledge documents" ON public.knowledge_documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER knowledge_documents_updated BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding extensions.vector,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX knowledge_chunks_user_idx ON public.knowledge_chunks (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_chunks TO authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own knowledge chunks" ON public.knowledge_chunks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.knowledge_documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
