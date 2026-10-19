import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { CHAT_MODEL, GatewayError } from "./rag.server";

export type GeneratedQuestion = { topic: string; subtopic: string; question: string; options: string[]; answer: number; explanation: string };

function provider() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "The AI service is not configured.");
  return createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
}

/** Split `count` questions across topics as evenly as possible. */
export function distribute(topics: string[], count: number) {
  return topics.map((t, i) => ({ topic: t, n: Math.floor(count / topics.length) + (i < count % topics.length ? 1 : 0) })).filter((x) => x.n > 0);
}

/** Generates fresh multiple-choice questions; validated so every question has 4 options and one valid answer. */
export async function generateQuestions(topics: string[], count: number, difficulty: string): Promise<GeneratedQuestion[]> {
  const plan = distribute(topics, count);
  let res;
  try {
    res = await generateText({
      model: provider().responses(CHAT_MODEL),
      system: "You write accurate campus-placement multiple-choice questions for engineering students. Each question has exactly 4 distinct options and exactly one correct option. Aptitude questions must be numerically correct. Avoid trick wording. Return ONLY JSON.",
      prompt: `Difficulty: ${difficulty}. Write exactly these numbers of questions per topic: ${plan.map((p) => `${p.topic}: ${p.n}`).join(", ")}.
Vary sub-topics. Return {"questions":[{"topic":string (exactly one of: ${plan.map((p) => p.topic).join(", ")}),"subtopic":string (short concept name, e.g. "JOIN", "GROUP BY", "Deadlocks", "Percentages"),"question":string,"options":[string,string,string,string],"answer":number (0-3 index of correct option),"explanation":string (1-2 sentences)}]}`,
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    });
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 502;
    throw new GatewayError(status, status === 402 ? "AI credits are exhausted. Please add credits to continue." : status === 429 ? "The assessment service is busy. Please try again in a moment." : "Questions could not be prepared. Please try again.");
  }
  const m = res.text.match(/\{[\s\S]*\}/);
  if (!m) throw new GatewayError(502, "Questions could not be prepared. Please try again.");
  const raw = (JSON.parse(m[0]).questions ?? []) as any[];
  const valid = raw
    .map((q) => ({ topic: String(q.topic ?? ""), subtopic: String(q.subtopic ?? "").slice(0, 60), question: String(q.question ?? "").trim(), options: Array.isArray(q.options) ? q.options.map(String) : [], answer: Number(q.answer), explanation: String(q.explanation ?? "") }))
    .filter((q) => topics.includes(q.topic) && q.question && q.options.length === 4 && new Set(q.options).size === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  // Keep the requested per-topic counts.
  const out: GeneratedQuestion[] = [];
  for (const p of plan) out.push(...valid.filter((q) => q.topic === p.topic).slice(0, p.n));
  if (out.length < Math.ceil(count * 0.8)) throw new GatewayError(502, "Questions could not be prepared. Please try again.");
  return out;
}

export type TopicScore = { topic: string; total: number; correct: number; incorrect: number; unanswered: number; score: number };

/**
 * Scoring rules (all derived from the saved answers):
 * - Total score = correct ÷ total questions.
 * - Accuracy = correct ÷ answered questions.
 * - Time efficiency = correct answers delivered per unit of time, against the allotted pace
 *   (limit ÷ total seconds per question): correct × pace ÷ time used, capped at 100%.
 *   All correct using the full limit = 100%; half correct in the full limit = 50%.
 */
export function grade(questions: { id: string; topic: string | null; correct_answer: string | null }[], answers: Map<string, string | null>, timeUsed: number, limit: number) {
  let correct = 0, incorrect = 0, unanswered = 0;
  const per = new Map<string, TopicScore>();
  const marks = new Map<string, boolean>();
  for (const q of questions) {
    const t = q.topic ?? "General";
    const row = per.get(t) ?? { topic: t, total: 0, correct: 0, incorrect: 0, unanswered: 0, score: 0 };
    row.total++;
    const sel = answers.get(q.id);
    if (sel == null || sel === "") { unanswered++; row.unanswered++; }
    else if (sel === q.correct_answer) { correct++; row.correct++; marks.set(q.id, true); }
    else { incorrect++; row.incorrect++; marks.set(q.id, false); }
    per.set(t, row);
  }
  const total = questions.length;
  const answered = correct + incorrect;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const used = Math.max(1, Math.min(timeUsed, limit));
  const timeEfficiency = total ? Math.min(100, Math.round(((correct * (limit / total)) / used) * 100)) : 0;
  const topics = [...per.values()].map((r) => ({ ...r, score: Math.round((r.correct / r.total) * 100) }));
  return { total, correct, incorrect, unanswered, score, accuracy, timeEfficiency, timeUsed: used, topics, marks };
}
