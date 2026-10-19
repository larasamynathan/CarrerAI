import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const EMBEDDING_MODEL = "google/gemini-embedding-2";
export const CHAT_MODEL = "openai/gpt-6-astra";
/** Minimum cosine similarity for a chunk to count as relevant evidence. */
export const MIN_SIMILARITY = 0.65;

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "The AI service is not configured.");
  return key;
}

/** Query processing: trim, collapse whitespace, cap length. */
export function processQuery(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 2000);
}

export async function embedQuery(text: string): Promise<number[]> {
  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 400));
  }
  res = res!;
  if (res.status === 429) throw new GatewayError(429, "The coach is busy right now. Please try again in a moment.");
  if (!res.ok) throw new GatewayError(res.status, await safeMessage(res));
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const v = json.data?.[0]?.embedding;
  if (!v?.length) throw new GatewayError(502, "The AI service returned no embedding.");
  return v;
}

async function safeMessage(res: Response) {
  try {
    const j = (await res.json()) as { message?: string; error?: { message?: string } | string };
    return j.message ?? (typeof j.error === "string" ? j.error : j.error?.message) ?? `AI request failed (${res.status}).`;
  } catch { return `AI request failed (${res.status}).`; }
}

export type RetrievedChunk = {
  id: string; document_id: string; title: string; content: string;
  category: string | null; topic: string | null; subtopic?: string | null; difficulty: string | null; source: string | null; similarity: number;
};

export function buildContext(chunks: RetrievedChunk[]) {
  return chunks.map((c, i) => `[${i + 1}] ${c.title} (${c.category ?? "General"} / ${c.topic ?? ""}, ${c.difficulty ?? "n/a"})\n${c.content}`).join("\n\n");
}

const SYSTEM = `You are CareerAI, an AI-powered placement preparation assistant.
You help engineering students prepare for software engineering placements across DSA, Java, Python, SQL, DBMS, operating systems, computer networks, OOP, software engineering, aptitude, HR and technical interviews, resumes and placement strategy.
Answer open-ended questions in these domains. Understand the student's intent (using the conversation history to resolve words like "it" or "that") and answer the actual question.
Use the numbered knowledge excerpts as the primary factual context and cite them inline like [1] or [2] for claims taken from them. Never invent citations.
Use examples, explanations, code, interview-style answers, step-by-step solutions and structured markdown-free formatting (short paragraphs, "-" bullets, numbered steps) when appropriate.
- Coding questions: give correct code and explain the approach and complexity.
- Aptitude questions: show the calculation step by step.
- Interview questions: give interview-ready answers.
- Resume questions: give practical, placement-oriented suggestions.
- When student preparation data is provided, use it to personalise (prioritise weak areas, reference scores) and call it "your data".
If the excerpts only partly cover the question, answer what they support and state clearly what the knowledge base does not cover rather than presenting outside facts as grounded.
Keep answers focused: usually under 350 words, longer only for plans or multi-question sets.`;

const GENERAL_SYSTEM = `You are CareerAI, a placement preparation assistant. The CareerAI knowledge base had no relevant material for this question, so give a careful general explanation from your own knowledge. Do not cite sources or claim the knowledge base said anything. If the question is unrelated to placements, careers or computer science, politely say you focus on placement preparation and suggest a related question. Keep it under 300 words, plain text with "-" bullets.`;

function client() {
  const key = apiKey();
  return createOpenAI({ baseURL: GATEWAY, apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
}

export const DOMAINS = ["Data Structures and Algorithms", "Java", "Python", "SQL", "DBMS", "Operating Systems", "Computer Networks", "OOP", "Software Engineering", "Aptitude", "HR Interviews", "Technical Interviews", "Resume Preparation", "Placement Preparation"] as const;

/** Query understanding: rewrite follow-ups into a standalone search query and detect the likely domain (used only to boost retrieval). */
export async function understandQuery(question: string, history: { role: string; content: string }[]): Promise<{ query: string; domain: string | null }> {
  const recent = history.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 400)}`).join("\n");
  try {
    const r = await generateText({
      model: client().responses(CHAT_MODEL),
      system: `Rewrite the student's latest message as a standalone search query (resolve pronouns like "it" from the conversation, keep key technical terms, max 30 words) and pick the single most relevant domain from: ${DOMAINS.join(", ")}; or null if none fits. Return only JSON: {"query": string, "domain": string|null}`,
      prompt: `${recent ? `Conversation:\n${recent}\n\n` : ""}Latest message: ${question}`,
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    });
    const j = JSON.parse(r.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { query?: string; domain?: string | null };
    const domain = DOMAINS.find((d) => d === j.domain) ?? null;
    return { query: (j.query || question).slice(0, 500), domain };
  } catch { return { query: question, domain: null }; }
}

/** Light rerank: small boost for chunks in the detected domain, then keep the best relevant ones. */
export function rerank(rows: RetrievedChunk[], domain: string | null, k = 5) {
  return rows
    .filter((r) => r.similarity >= MIN_SIMILARITY)
    .map((r) => ({ r, s: r.similarity + (domain && r.category === domain ? 0.03 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.r);
}

export async function generateGeneralAnswer(question: string, history: { role: "user" | "assistant"; content: string }[]) {
  try {
    const r = await generateText({ model: client().responses(CHAT_MODEL), system: GENERAL_SYSTEM, messages: [...history.slice(-6), { role: "user", content: question }], providerOptions: { openai: { reasoningEffort: "low", store: false } } });
    return r.text.trim();
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 502;
    throw new GatewayError(status, status === 402 ? "AI credits are exhausted. Please add credits to continue." : status === 429 ? "The coach is busy right now. Please try again in a moment." : "The coach could not generate an answer.");
  }
}

export async function generateGroundedAnswer(question: string, chunks: RetrievedChunk[], history: { role: "user" | "assistant"; content: string }[], student = "") {
  const key = apiKey();
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system: SYSTEM,
    messages: [
      ...history.slice(-8).map((m) => ({ ...m, content: m.content.slice(0, 1500) })),
      { role: "user", content: `Knowledge excerpts:\n\n${chunks.length ? buildContext(chunks) : "(no knowledge excerpts matched; rely on student data only)"}${student ? `\n\nStudent preparation data:\n${student}` : ""}\n\nStudent question: ${question}` },
    ],
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  const text = (await result.text).trim();
  if (failure) {
    const status = (failure as { statusCode?: number }).statusCode ?? 502;
    throw new GatewayError(status, status === 402 ? "AI credits are exhausted. Please add credits to continue." : status === 429 ? "The coach is busy right now. Please try again in a moment." : "The coach could not generate an answer.");
  }
  if (!text) throw new GatewayError(502, "The coach could not generate an answer for this question.");
  return text;
}
