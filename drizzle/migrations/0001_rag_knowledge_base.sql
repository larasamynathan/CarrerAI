ALTER TABLE public.knowledge_documents ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.knowledge_documents
  ADD COLUMN category text,
  ADD COLUMN topic text,
  ADD COLUMN difficulty text;
CREATE INDEX knowledge_documents_category_idx ON public.knowledge_documents (category);

ALTER TABLE public.knowledge_chunks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.knowledge_chunks
  ADD COLUMN embedding_3072 extensions.vector(3072),
  ADD COLUMN category text,
  ADD COLUMN topic text,
  ADD COLUMN difficulty text,
  ADD COLUMN source text;
COMMENT ON COLUMN public.knowledge_chunks.embedding IS 'DEPRECATED: replaced by embedding_3072';
CREATE INDEX knowledge_chunks_document_idx ON public.knowledge_chunks (document_id);
CREATE INDEX knowledge_chunks_category_idx ON public.knowledge_chunks (category);
CREATE INDEX knowledge_chunks_embedding_idx ON public.knowledge_chunks
  USING hnsw ((embedding_3072::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

DROP POLICY "Own knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Read shared or own knowledge documents" ON public.knowledge_documents FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Insert own knowledge documents" ON public.knowledge_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own knowledge documents" ON public.knowledge_documents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own knowledge documents" ON public.knowledge_documents FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY "Own knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Read shared or own knowledge chunks" ON public.knowledge_chunks FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Insert own knowledge chunks" ON public.knowledge_chunks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.knowledge_documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
CREATE POLICY "Delete own knowledge chunks" ON public.knowledge_chunks FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.chat_messages ADD COLUMN sources jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(3072),
  match_count integer DEFAULT 6,
  filter_category text DEFAULT NULL
) RETURNS TABLE (id uuid, document_id uuid, title text, content text, category text, topic text, difficulty text, source text, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT c.id, c.document_id, d.title, c.content, c.category, c.topic, c.difficulty, c.source,
         1 - (c.embedding_3072::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.knowledge_chunks c JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding_3072 IS NOT NULL AND (filter_category IS NULL OR c.category = filter_category)
  ORDER BY c.embedding_3072::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT least(greatest(match_count, 1), 12);
$$;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, integer, text) TO authenticated;