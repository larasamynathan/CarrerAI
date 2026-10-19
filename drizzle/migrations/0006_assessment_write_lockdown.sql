-- All assessment writes go through authenticated server functions that grade on the server.
REVOKE INSERT, UPDATE ON public.assessments FROM authenticated, anon;
REVOKE INSERT, UPDATE ON public.assessment_answers FROM authenticated, anon;
GRANT SELECT, DELETE ON public.assessments TO authenticated;
GRANT SELECT, DELETE ON public.assessment_answers TO authenticated;
GRANT SELECT, DELETE ON public.assessment_results TO authenticated;