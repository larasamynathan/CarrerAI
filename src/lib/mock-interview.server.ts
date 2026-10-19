import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { CHAT_MODEL, GatewayError } from "./rag.server";

function provider() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "The AI service is not configured.");
  return createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
}

function friendly(e: unknown, what: string): never {
  const status = (e as { statusCode?: number }).statusCode ?? 502;
  throw new GatewayError(status, status === 402 ? "AI credits are exhausted. Please add credits to continue." : status === 429 ? "The interviewer is busy. Please try again in a moment." : `${what} Please try again.`);
}

async function json(system: string, prompt: string, what: string) {
  let res;
  try { res = await generateText({ model: provider().responses(CHAT_MODEL), system, prompt, providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } } }); }
  catch (e) { friendly(e, what); }
  const m = res.text.match(/\{[\s\S]*\}/);
  if (!m) throw new GatewayError(502, `${what} Please try again.`);
  try { return JSON.parse(m[0]); } catch { throw new GatewayError(502, `${what} Please try again.`); }
}

/** Normalised fingerprint used to reject repeated or near-identical questions within one interview. */
export function questionKey(q: string) {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3).slice(0, 14).join(" ");
}
function similar(a: string, b: string) {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / Math.max(1, Math.min(A.size, B.size)) > 0.7;
}

const GUIDE: Record<string, string> = {
  Technical: "core CS and programming: DSA, OOP, DBMS/SQL, operating systems, networks, the candidate's projects and problem solving. Mix conceptual, applied and scenario questions.",
  HR: "HR round: self-introduction, motivation, career goals, strengths and development areas, company fit, relocation/flexibility, salary expectations handled professionally.",
  Behavioral: "behavioural round answered with STAR: teamwork, conflict, failure, leadership, deadlines, ownership, learning, ethics. Each question about a different situation.",
};

/** Generates a set of distinct questions; duplicates and near-duplicates are removed before use. */
export async function generateInterviewQuestions(type: string, role: string, company: string | null, count: number) {
  const out: { question: string; focus: string; key: string }[] = [];
  for (let attempt = 0; attempt < 2 && out.length < count; attempt++) {
    const need = count - out.length + 3;
    const r = await json(
      "You are an experienced campus-placement interviewer. Write realistic, distinct interview questions. Never repeat or rephrase a question. Return ONLY JSON.",
      `Interview type: ${type} — ${GUIDE[type]}\nTarget role: ${role}${company ? ` at ${company}` : ""}.\nWrite ${need} questions, ordered from warm-up to more challenging, each on a different focus area.${out.length ? `\nDo NOT ask anything similar to:\n${out.map((q) => `- ${q.question}`).join("\n")}` : ""}\nReturn {"questions":[{"question":string,"focus":string (2-4 word area, e.g. "Hashing", "Conflict resolution")}]}`,
      "Interview questions could not be prepared.",
    );
    for (const q of (r.questions ?? []) as any[]) {
      const question = String(q.question ?? "").trim();
      if (question.length < 12) continue;
      const key = questionKey(question);
      if (!key || out.some((o) => o.key === key || similar(o.key, key))) continue;
      out.push({ question, focus: String(q.focus ?? type).slice(0, 40), key });
      if (out.length >= count) break;
    }
  }
  if (out.length < count) throw new GatewayError(502, "Interview questions could not be prepared. Please try again.");
  return out;
}

const HEDGES = /\b(maybe|i think|i guess|probably|kind of|sort of|not sure|perhaps|i don't know|i dont know|um+|uh+|like,)\b/gi;

/** Observable, text-only response indicators. These describe the written answer, not the person. */
export function responseIndicators(answer: string, seconds: number | null, limit: number) {
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const hedges = (answer.match(HEDGES) ?? []).length;
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 3).length;
  return {
    words,
    hedgeRate: words ? Math.round((hedges / words) * 1000) / 10 : 0, // hedging phrases per 100 words
    hasExample: /\b(for example|for instance|in my [a-z- ]{0,20}project|when (i|we)|once|at my|during|we built|i built|i led|i implemented)\b/i.test(answer),
    hasNumbers: /\d/.test(answer),
    sentences,
    timeUsedPct: seconds == null ? null : Math.min(100, Math.round((seconds / limit) * 100)),
  };
}

export type Evaluation = { score: number; communication: number; knowledge: number; relevance: number; feedback: string; strengths: string[]; improve: string[]; indicators: ReturnType<typeof responseIndicators> };

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export async function evaluateAnswer(type: string, role: string, question: string, answer: string, seconds: number | null, limit: number): Promise<Evaluation> {
  const indicators = responseIndicators(answer, seconds, limit);
  if (indicators.words < 3) return { score: 0, communication: 0, knowledge: 0, relevance: 0, feedback: "No substantive answer was given.", strengths: [], improve: ["Attempt every question — even a partial, structured answer earns credit."], indicators };
  const r = await json(
    `You evaluate a ${type} placement-interview answer for a ${role} candidate. Judge only the written answer's content against the question. Be fair, specific and constructive. Do not comment on personality, emotions or psychological traits. Return ONLY JSON.`,
    `Question: ${question}\nAnswer: ${answer.slice(0, 4000)}\n\nScore 0-100 each:\n- communication: clarity, structure, conciseness${type === "Behavioral" ? ", STAR structure" : ""}\n- knowledge: ${type === "Technical" ? "technical correctness and depth" : "substance, concrete evidence and role/company awareness"}\n- relevance: how directly it answers the question asked\nReturn {"communication":n,"knowledge":n,"relevance":n,"feedback":string (2-3 sentences),"strengths":[string] (max 2),"improve":[string] (max 2, actionable)}`,
    "The answer could not be evaluated.",
  );
  const communication = clamp(r.communication), knowledge = clamp(r.knowledge), relevance = clamp(r.relevance);
  return {
    communication, knowledge, relevance,
    score: Math.round(knowledge * 0.4 + relevance * 0.35 + communication * 0.25),
    feedback: String(r.feedback ?? "").slice(0, 800),
    strengths: (Array.isArray(r.strengths) ? r.strengths : []).map(String).slice(0, 2),
    improve: (Array.isArray(r.improve) ? r.improve : []).map(String).slice(0, 2),
    indicators,
  };
}

export type Report = {
  overall: number; communication: number; knowledge: number; relevance: number; answered: number; total: number;
  indicators: { avgWords: number; hedgeRate: number; exampleRate: number; avgTimePct: number | null };
  summary: string; improve: string[]; nextPractice: { title: string; detail: string; link: string }[];
};

/** Aggregates per-question evaluations; averages include unanswered questions as 0. */
export async function buildReport(type: string, role: string, rows: { question: string; focus: string | null; answer: string | null; evaluation: any }[]): Promise<Report> {
  const evals = rows.map((r) => (r.evaluation && typeof r.evaluation.score === "number" ? (r.evaluation as Evaluation) : null));
  const avg = (f: (e: Evaluation) => number) => Math.round(evals.reduce((s, e) => s + (e ? f(e) : 0), 0) / Math.max(1, rows.length));
  const answered = rows.filter((r) => r.answer && r.answer.trim()).length;
  const done = evals.filter((e): e is Evaluation => !!e && e.indicators.words >= 3);
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const times = done.map((e) => e.indicators.timeUsedPct).filter((x): x is number => x != null);
  const report: Report = {
    overall: avg((e) => e.score), communication: avg((e) => e.communication), knowledge: avg((e) => e.knowledge), relevance: avg((e) => e.relevance),
    answered, total: rows.length,
    indicators: { avgWords: mean(done.map((e) => e.indicators.words)), hedgeRate: done.length ? Math.round((done.reduce((s, e) => s + e.indicators.hedgeRate, 0) / done.length) * 10) / 10 : 0, exampleRate: done.length ? Math.round((done.filter((e) => e.indicators.hasExample).length / done.length) * 100) : 0, avgTimePct: times.length ? mean(times) : null },
    summary: "", improve: [], nextPractice: [],
  };
  const weak = rows.map((r, i) => ({ focus: r.focus ?? "", s: evals[i]?.score ?? 0 })).sort((a, b) => a.s - b.s).slice(0, 3);
  try {
    const r = await json(
      "You write a concise, encouraging placement mock-interview report. Base it only on the scores and feedback provided. Do not assess personality or psychological traits. Return ONLY JSON.",
      `${type} interview for ${role}. Overall ${report.overall}%, communication ${report.communication}%, knowledge ${report.knowledge}%, relevance ${report.relevance}%. Answered ${answered}/${rows.length}.\nPer question:\n${rows.map((q, i) => `${i + 1}. [${q.focus}] score ${evals[i]?.score ?? 0}: ${evals[i]?.feedback ?? "not answered"} Improve: ${(evals[i]?.improve ?? []).join("; ")}`).join("\n")}\nReturn {"summary":string (2-3 sentences),"improve":[string] (3 specific areas),"nextPractice":[{"title":string,"detail":string}] (2-3 concrete practice actions)}`,
      "The report could not be written.",
    );
    report.summary = String(r.summary ?? "");
    report.improve = (r.improve ?? []).map(String).slice(0, 4);
    report.nextPractice = (r.nextPractice ?? []).slice(0, 3).map((p: any) => ({ title: String(p.title ?? ""), detail: String(p.detail ?? ""), link: type === "Technical" ? "/assessment" : "/coach" }));
  } catch {
    report.summary = `You scored ${report.overall}% across ${answered} of ${rows.length} answered questions.`;
    report.improve = weak.filter((w) => w.focus).map((w) => `Strengthen your answers on ${w.focus}.`);
  }
  report.nextPractice.push({ title: `Another ${type} interview`, detail: "Retake to see whether your scores improve on fresh questions.", link: "/mock-interview" });
  return report;
}
