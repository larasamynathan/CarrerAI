import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { CHAT_MODEL, GatewayError } from "./rag.server";

export type ParsedResume = {
  name: string; contact: { email?: string; phone?: string; links?: string[]; location?: string };
  summary: string; education: string[]; skills: string[]; projects: string[]; experience: string[];
  certifications: string[]; achievements: string[];
};
export type AiReview = { strengths: string[]; improvements: string[]; suggestions: string[] };
export type AtsFactor = { name: string; score: number; weight: number; detail: string };

/** Role keyword sets used when no job description is supplied. */
const ROLE_KEYWORDS: Record<string, string[]> = {
  "Software Engineer": ["data structures", "algorithms", "java", "python", "sql", "git", "oop", "rest", "api", "testing", "dbms", "operating systems", "problem solving", "javascript", "linux"],
  "Data Analyst": ["sql", "python", "excel", "statistics", "tableau", "power bi", "pandas", "visualization", "dashboard", "data cleaning", "reporting"],
  "Web Developer": ["html", "css", "javascript", "react", "node", "api", "git", "typescript", "responsive", "database", "rest"],
};
export const ROLES = Object.keys(ROLE_KEYWORDS);

const STOP = new Set("the and for with you are this that your from have will our who has all using work team role experience skills ability strong about into their job more including must should able good years year plus etc".split(" "));

function keywordsFrom(jd: string) {
  const words = jd.toLowerCase().match(/[a-z][a-z0-9]*(?:[.+#][a-z0-9]+)*/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) if (w.length >= 3 && !STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w);
}

function provider() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "The AI service is not configured.");
  return createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
}

function parseJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new GatewayError(502, "The AI returned an unreadable analysis.");
  return JSON.parse(m[0]) as T;
}

const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 20) : []);

export async function extractAndReview(raw: string, role: string): Promise<{ parsed: ParsedResume; review: AiReview }> {
  let res;
  try {
    res = await generateText({
      model: provider().responses(CHAT_MODEL),
      system: `You parse student resumes and give honest, specific feedback for campus placement. Only extract what is written; use empty strings/arrays when absent. Never invent facts. Return ONLY JSON.`,
      prompt: `Target role: ${role}\n\nResume text:\n"""${raw.slice(0, 14000)}"""\n\nReturn JSON with keys:
{"name":string,"contact":{"email":string,"phone":string,"links":string[],"location":string},"summary":string,"education":string[],"skills":string[],"projects":string[] (one short line each),"experience":string[] (one line each),"certifications":string[],"achievements":string[],
"strengths":string[] (3-5, specific),"improvements":string[] (3-6 concrete issues),"suggestions":string[] (4-6 actionable rewrite tips, e.g. "Your project descriptions would be stronger with measurable outcomes.")}`,
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    });
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 502;
    throw new GatewayError(status, status === 402 ? "AI credits are exhausted. Please add credits to continue." : status === 429 ? "The analyzer is busy. Please try again in a moment." : "The resume could not be analyzed.");
  }
  const j = parseJson<any>(res.text);
  const c = j.contact ?? {};
  return {
    parsed: {
      name: String(j.name ?? ""), contact: { email: c.email || undefined, phone: c.phone || undefined, links: arr(c.links), location: c.location || undefined },
      summary: String(j.summary ?? ""), education: arr(j.education), skills: arr(j.skills), projects: arr(j.projects), experience: arr(j.experience),
      certifications: arr(j.certifications), achievements: arr(j.achievements),
    },
    review: { strengths: arr(j.strengths), improvements: arr(j.improvements), suggestions: arr(j.suggestions) },
  };
}

/** Deterministic, explainable ATS-style score. Weights sum to 100. */
export function scoreResume(raw: string, p: ParsedResume, role: string, jd: string) {
  const text = raw.toLowerCase();
  const target = jd.trim().length > 40 ? keywordsFrom(jd) : (ROLE_KEYWORDS[role] ?? ROLE_KEYWORDS["Software Engineer"]!);
  const matched = target.filter((k) => text.includes(k));
  const missing = target.filter((k) => !text.includes(k));
  const skillText = p.skills.join(" ").toLowerCase();
  const roleSkills = (ROLE_KEYWORDS[role] ?? ROLE_KEYWORDS["Software Engineer"]!);
  const skillHits = roleSkills.filter((k) => skillText.includes(k) || text.includes(k)).length;
  const metric = /\d+\s?%|\d+x|\b\d{2,}\b|reduced|increased|improved|users|latency/i;
  const projMetric = p.projects.filter((x) => metric.test(x)).length;
  const projRelevant = p.projects.filter((x) => roleSkills.some((k) => x.toLowerCase().includes(k))).length;
  const sections = [p.name, p.contact.email || p.contact.phone, p.summary, p.education.length, p.skills.length, p.projects.length, p.experience.length || p.achievements.length, p.certifications.length || p.achievements.length];
  const words = raw.split(/\s+/).filter(Boolean).length;
  const bullets = (raw.match(/^\s*[•\-*▪●]/gm) ?? []).length;
  let fmt = 40; if (words >= 250 && words <= 900) fmt += 30; else if (words >= 150 && words <= 1200) fmt += 15;
  if (bullets >= 5) fmt += 20; if (p.contact.email) fmt += 10;

  const pct = (a: number, b: number) => (b ? Math.round(Math.min(1, a / b) * 100) : 0);
  const factors: AtsFactor[] = [
    { name: "Keyword Match", weight: 25, score: pct(matched.length, target.length), detail: `${matched.length} of ${target.length} target keywords found` },
    { name: "Skills Coverage", weight: 20, score: pct(skillHits, Math.min(8, roleSkills.length)), detail: `${skillHits} core ${role} skills present` },
    { name: "Project Relevance", weight: 15, score: p.projects.length ? Math.round((pct(projRelevant, p.projects.length) * 0.6) + (pct(projMetric, p.projects.length) * 0.4)) : 0, detail: p.projects.length ? `${projRelevant}/${p.projects.length} relevant, ${projMetric} with measurable outcomes` : "No projects detected" },
    { name: "Experience", weight: 10, score: pct(p.experience.length, 2), detail: p.experience.length ? `${p.experience.length} internship/work entries` : "No internships or work entries detected" },
    { name: "Education", weight: 10, score: p.education.length ? 100 : 0, detail: p.education.length ? "Education section found" : "Education not detected" },
    { name: "Formatting", weight: 10, score: Math.min(100, fmt), detail: `${words} words, ${bullets} bullet points` },
    { name: "Section Completeness", weight: 10, score: pct(sections.filter(Boolean).length, sections.length), detail: `${sections.filter(Boolean).length} of ${sections.length} standard sections` },
  ];
  const total = Math.round(factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0));
  return { total, factors, matched, missing };
}
