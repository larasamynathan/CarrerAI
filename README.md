# CareerAI — AI-Powered Placement Preparation Platform

CareerAI is a full-stack web app that helps engineering students prepare for campus placements. It measures where a student actually stands (skills, assessments, mock interviews, resume), finds weak areas, and turns that into a personalised study plan, with an AI coach grounded in a curated knowledge base.

> **Design principle:** no fake data. Readiness scores, charts and recommendations are derived only from the student's own recorded activity. Anything not yet measured is shown as *unmeasured* (never as zero), and charts appear only when there is enough real history.

🔗 Live Demo:https://carrer-ai-zeta.vercel.app/





---

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Live placement readiness across seven skill areas, weakest areas, today's tasks, progress charts, upcoming sessions and the next recommended action. |
| **Skill Assessment** | Timed, AI-generated MCQ tests by topic. Questions are generated server-side, answer keys are hidden from the client, and grading happens on the server so scores cannot be forged. |
| **Weak Area Engine** | Explainable scoring (recency and difficulty weighted, trend, consistency, concept accuracy) that stores weak topics with one open recommendation each. |
| **AI Coach (RAG)** | Chat assistant that answers from a curated placement knowledge base with source citations. If nothing relevant is found, it says so and gives a clearly labelled "General AI answer". |
| **Mock Interview** | Technical, HR and Behavioral rounds. Questions are unique per session, revealed one at a time, AI-evaluated (communication, knowledge, relevance) and summarised in a final report. |
| **Resume Analyzer** | Private upload (PDF/DOCX), text extraction, estimated ATS-style score, AI feedback and saved history. |
| **Preparation Roadmaps** | Deterministic 7-day and 30-day plans built from the student's skills, weak areas, assessments, resume and interview scores. Plans stay stable until the student rebuilds them. |
| **Schedule** | Calendar and timeline of prep sessions. Each session launches the matching module, and completing it logs a practice session. |
| **Progress Analytics** | Trend and improvement charts derived from real attempts. |
| **Resource Library** | Shared catalogue of learning resources with difficulty, estimated time and publisher attribution, plus per-student completion tracking. |
| **Auth & Profile** | Register, login, logout, forgot/reset password, protected routes. |

---

## Tech Stack

- **Frontend:** React 19, TypeScript, TanStack Start / Router (file-based routing), Tailwind CSS v4, shadcn/ui (Radix), Recharts, Sonner
- **Backend:** TanStack Start server functions
- **Database & Auth:** Supabase (PostgreSQL, Auth, Storage) with row-level security, managed through Lovable Cloud
- **AI:** Vercel AI SDK with an OpenAI-compatible Lovable AI Gateway for chat and evaluation
- **RAG:** Embeddings stored in pgvector (3072-dim) and searched with the `match_knowledge_chunks` SQL function
- **Document parsing:** `unpdf` (PDF) and `mammoth` (DOCX)
- **Tooling:** Bun, Vite, Vitest, ESLint, Prettier, Drizzle Kit (migrations)

---

## Architecture Highlights

- **Row-level security everywhere.** Every student table keys on `user_id` with the policy `user_id = auth.uid()`. Child rows also check parent ownership, so data cannot cross accounts.
- **Server-trusted scoring.** Assessment and mock-interview writes go through authenticated server functions (student INSERT/UPDATE is revoked), so scores cannot be tampered with from the browser.
- **Pure, testable engines.** `weak-areas.engine.ts`, `roadmap.engine.ts` and `analytics.engine.ts` are pure functions, which keeps scoring explainable and deterministic.
- **RAG pipeline.** Query understanding (follow-up rewrite and domain detection), then embedding, then vector search with a 0.65 similarity threshold and domain re-ranking, then a grounded answer with sources.
- **Protected routes.** All workspace pages live under the `_authenticated` layout. Only `/auth` and `/reset-password` are public.

---

## Project Structure

```
├── drizzle/migrations/     # SQL schema, RLS policies, RAG, assessment, roadmap, resources
├── scripts/
│   ├── ingest-knowledge.ts # Clean, chunk, embed and store the knowledge base
│   ├── knowledge-corpus.json
│   └── knowledge-topics.json
├── src/
│   ├── components/
│   │   ├── career/         # Feature views (dashboard, coach, assessment, interview, resume...)
│   │   └── ui/             # shadcn/ui primitives
│   ├── integrations/supabase/  # Client, server client, auth middleware, generated types
│   ├── lib/                # Engines (*.engine.ts), server logic (*.server.ts), server functions (*.functions.ts)
│   ├── routes/             # File-based routes (_authenticated/* + auth pages)
│   └── test/               # Vitest unit and routing tests
├── roadmap.md
└── package.json
```

---

## Knowledge Base Coverage

The RAG knowledge base covers 14 categories: Data Structures & Algorithms, Java, Python, SQL, DBMS, Operating Systems, Computer Networks, OOP, Software Engineering, Aptitude, Technical Interviews, HR Interviews, Resume Preparation and Placement Preparation.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+ with npm)
- A Supabase project (or a Lovable Cloud project)
- An AI gateway key (`LOVABLE_API_KEY`)

### 1. Clone and install

```bash
git clone https://github.com/larasamynathan/<your-repo-name>.git
cd <your-repo-name>
bun install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_PROJECT_ID=your_project_id

# Server-only secrets (never commit these)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LOVABLE_API_KEY=your_ai_gateway_key
```

### 3. Set up the database

Apply the SQL files in `drizzle/migrations/` in order (`0000` to `0012`) to your Supabase project. They create the tables, row-level security policies, vector search function, storage policies and resource catalogue.

### 4. Ingest the knowledge base (one time)

```bash
bun ./scripts/ingest-knowledge.ts
```

This chunks the curated notes, generates embeddings and stores them for the AI Coach. It is resumable if interrupted.

### 5. Run the app

```bash
bun run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

---

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |
| `bunx vitest` | Run unit tests |

---

## Roadmap

- [x] Auth, protected routes and student database with RLS
- [x] Dashboard, assessments, weak-area engine, mock interviews, scheduling
- [x] RAG knowledge system and grounded AI Coach
- [x] Resume Analyzer, roadmaps, analytics and resource library
- [ ] Cross-device verification of the redesigned layouts (desktop and mobile)
