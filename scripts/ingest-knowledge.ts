// Backend-only ingestion: Document -> cleaning -> chunking -> metadata -> embedding -> vector storage.
// Run: bun ./scripts/ingest-knowledge.ts (needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
import corpus from "./knowledge-corpus.json";
import topics from "./knowledge-topics.json";
import { createClient } from "@supabase/supabase-js";

const MODEL = "google/gemini-embedding-2";
const key = process.env.LOVABLE_API_KEY;
if (!key) throw new Error("LOVABLE_API_KEY missing");

type Chunk = { content: string; subtopic: string | null };
type Doc = { title: string; category: string; topic: string; difficulty: string; source: string; chunks: Chunk[] };

const clean = (t: string) => t.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

/** Split text into ~MAX-char chunks on sentence boundaries with one-sentence overlap. */
function chunk(text: string, max = 1100): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
  const out: string[] = []; let cur: string[] = [];
  for (const s of sentences) {
    if (cur.join("").length + s.length > max && cur.length) { out.push(cur.join("").trim()); cur = [cur[cur.length - 1]!]; }
    cur.push(s);
  }
  if (cur.length) out.push(cur.join("").trim());
  return out;
}

const docs: Doc[] = [];
for (const d of corpus as any[]) {
  docs.push({ title: d.title, category: d.category, topic: d.topic, difficulty: d.difficulty, source: d.source, chunks: d.sections.flatMap((s: string) => {
    const c = clean(s); const head = c.split(":")[0]!; const sub = head.length < 60 ? head : null;
    return chunk(c).map((content) => ({ content, subtopic: sub }));
  }) });
}
const grouped = new Map<string, Doc>();
for (const [category, topic, subtopic, difficulty, content] of topics as string[][]) {
  const k = `${category}|${topic}`;
  if (!grouped.has(k)) grouped.set(k, { title: `${topic} — ${category}`, category: category!, topic: topic!, difficulty: difficulty!, source: `CareerAI curated notes: ${category}`, chunks: [] });
  grouped.get(k)!.chunks.push(...chunk(clean(content!)).map((c) => ({ content: c, subtopic: subtopic! })));
}
docs.push(...grouped.values());

async function embed(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < 9; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      const out: number[][] = [];
      for (const d of json.data) out[d.index] = d.embedding;
      if (out.length !== texts.length || out.some((v) => !v)) throw new Error("Missing embeddings");
      return out;
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);
    await new Promise((r) => setTimeout(r, Math.min(30000, 1500 * 2 ** attempt) + Math.random() * 500));
  }
  throw new Error("Embeddings failed after retries");
}

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
// Remove shared docs no longer in the corpus; existing complete docs are skipped so the run is resumable.
const titles = new Set(docs.map((d) => d.title));
const { data: existing } = await db.from("knowledge_documents").select("id,title,knowledge_chunks(count)").is("user_id", null);
const done = new Set<string>();
for (const e of (existing ?? []) as any[]) {
  const want = docs.find((d) => d.title === e.title)?.chunks.length;
  if (titles.has(e.title) && want === e.knowledge_chunks?.[0]?.count && !process.env.FULL) done.add(e.title);
  else await db.from("knowledge_documents").delete().eq("id", e.id);
}
let total = 0;
async function embedAll(texts: string[]) { const out: number[][] = []; for (let i = 0; i < texts.length; i += 4) out.push(...(await embed(texts.slice(i, i + 4)))); return out; }
for (const doc of docs) {
  if (done.has(doc.title)) { total += doc.chunks.length; continue; }
  const vectors = await embedAll(doc.chunks.map((c) => `${doc.category} > ${doc.topic}${c.subtopic ? ` > ${c.subtopic}` : ""}\n${c.content}`));
  const { data: d, error } = await db.from("knowledge_documents").insert({ user_id: null, title: doc.title, source: doc.source, content: doc.chunks.map((c) => c.content).join("\n\n"), category: doc.category, topic: doc.topic, difficulty: doc.difficulty, metadata: { shared: true } }).select("id").single();
  if (error) throw error;
  const { error: e2 } = await db.from("knowledge_chunks").insert(doc.chunks.map((c, i) => ({ document_id: d.id, user_id: null, chunk_index: i, content: c.content, category: doc.category, topic: doc.topic, subtopic: c.subtopic, difficulty: doc.difficulty, source: doc.source, embedding_3072: `[${vectors[i]!.join(",")}]` })));
  if (e2) throw e2;
  total += doc.chunks.length;
  console.log("ingested", doc.title, doc.chunks.length);
  await new Promise((r) => setTimeout(r, 800));
}
console.log("documents", docs.length, "chunks", total);
