ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS subtopic text;
CREATE INDEX IF NOT EXISTS knowledge_chunks_topic_idx ON public.knowledge_chunks (category, topic, subtopic);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks(extensions.vector, integer, text);
CREATE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(3072),
  match_count integer DEFAULT 6,
  filter_category text DEFAULT NULL
) RETURNS TABLE (id uuid, document_id uuid, title text, content text, category text, topic text, subtopic text, difficulty text, source text, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT c.id, c.document_id, d.title, c.content, c.category, c.topic, c.subtopic, c.difficulty, c.source,
         1 - (c.embedding_3072::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.knowledge_chunks c JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding_3072 IS NOT NULL AND (filter_category IS NULL OR c.category = filter_category)
  ORDER BY c.embedding_3072::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT least(greatest(match_count, 1), 20);
$$;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, text) TO authenticated, service_role;