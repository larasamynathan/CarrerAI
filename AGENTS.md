<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- CareerAI uses a shared shell with TanStack file routes and feature views so navigation and visual language stay consistent.
- Student-owned progress lives in Lovable Cloud tables guarded by row-level security, so data survives devices and cannot cross accounts.

- CareerAI's presentation uses one global editorial design system and shared UI primitives, so feature screens stay consistent and accessible.
- All workspace pages live under the `_authenticated` layout (sign-in required); only `/auth` and `/reset-password` are public, so no student data renders signed-out.
- Every student table keys on `user_id` → `profiles.user_id` with RLS `user_id = auth.uid()`; child rows also check parent ownership, so data can never cross accounts. The profile row is created client-side on first sign-in (no triggers on the auth schema).
- `resources` is a shared read-only catalog for signed-in users; it is only written from the backend.
- Dashboard readiness and recommendations are derived from the student’s existing skills, assessment, practice, interview, resume, weak-area, and recommendation rows; missing signals remain unmeasured rather than becoming fake scores.
- RAG: shared knowledge rows have `user_id IS NULL` (read-only to students, written by resumable `scripts/ingest-knowledge.ts` from knowledge-corpus.json + knowledge-topics.json with service role); every message runs query understanding (follow-up rewrite + domain) → embed → `match_knowledge_chunks` (SECURITY INVOKER) → threshold 0.65 + domain rerank → grounded answer; with no relevant chunks the reply states that and gives a clearly labelled "General AI answer" — keeps grounded vs general answers distinct.
- Assessments: questions are AI-generated server-side; answer keys are column-hidden from students and all assessment writes/grading go through authenticated server functions (service role after ownership check), so scores cannot be forged; after grading, the weak-area engine runs.
- Weak areas: pure scoring in weak-areas.engine.ts (recency + difficulty weighted, trend, consistency, concept accuracy) run by weak-areas.server.ts on assessment submit and on Weak Areas page load; results upserted to weak_areas (source 'engine', one row per topic, on-track rows resolved) with one open recommendation each — keeps scoring explainable and stored.
- Mock interviews: questions generated server-side per session and deduplicated (normalized question_key, unique index per interview); questions are revealed one at a time; answers are AI-evaluated and stored only via authenticated server functions (student INSERT/UPDATE revoked), and the final report also feeds the weak-area engine — prevents repeats and forged scores.
- Schedule: scheduled_sessions rows (session_type, duration, started/completed) are written client-side under RLS; each session type maps to an existing module route with search params (assessment ?topic, mock-interview ?type, resume), and completing one logs a practice_sessions row — no duplicate practice implementations.
- Roadmaps: 7/30-day plans built by pure deterministic roadmap.engine.ts from existing skill, weak-area, assessment, resume and interview rows, saved once per student per length (roadmaps + roadmap_tasks under owner RLS) and rebuilt only on explicit request — plans stay stable across refreshes and explainable.
- Progress analytics: pure analytics.engine.ts derives every metric/chart from existing student rows (no new tables); charts render only when real history suffices (trend ≥2 results, improvement ≥2 attempts per topic), otherwise an explanatory empty state — no fabricated history.
- Resource library: shared read-only resources catalog (difficulty, estimated_minutes, source_name attribution; original summaries only, links to publishers) + per-student resource_progress under owner RLS for completion.
