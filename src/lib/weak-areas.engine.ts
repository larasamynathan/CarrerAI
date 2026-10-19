/** Pure, explainable weak-area scoring. No I/O; safe to unit test and import anywhere. */
export type Attention = "High Attention" | "Needs Improvement" | "On Track";
export type Trend = "Improving" | "Declining" | "Steady" | "New";
export type Attempt = { topic: string; score: number; at: string; difficulty?: string | null; source: "Assessment" | "Practice" | "Mock interview" };
export type ConceptStat = { topic: string; subtopic: string; correct: number; total: number };
export type TopicInsight = {
  topic: string; score: number; trend: Trend; attention: Attention; attempts: number; reason: string; action: string; minutes: number;
  weakConcepts: string[]; signals: string[]; lastActivity: string;
};

const ALIASES: Record<string, string> = { "data structures": "DSA", algorithms: "DSA", "data structures and algorithms": "DSA", databases: "DBMS", "object-oriented programming": "OOP", networks: "Computer Networks", os: "Operating Systems" };
export function normalizeTopic(t: string) { const k = t.trim().toLowerCase(); return ALIASES[k] ?? t.trim(); }

/** Harder tests count slightly more and their scores are adjusted up a little, easier ones down. */
const DIFFICULTY: Record<string, { adjust: number; weight: number }> = { easy: { adjust: -5, weight: 0.8 }, medium: { adjust: 0, weight: 1 }, hard: { adjust: 5, weight: 1.2 } };
const HALF_LIFE_DAYS = 21;

export function analyzeTopics(attempts: Attempt[], concepts: ConceptStat[], now = Date.now()): TopicInsight[] {
  const byTopic = new Map<string, Attempt[]>();
  for (const a of attempts) { const t = normalizeTopic(a.topic); byTopic.set(t, [...(byTopic.get(t) ?? []), { ...a, topic: t }]); }
  const out: TopicInsight[] = [];
  for (const [topic, list] of byTopic) {
    const sorted = [...list].sort((a, b) => +new Date(a.at) - +new Date(b.at));
    let wSum = 0, sSum = 0;
    const adjusted = sorted.map((a) => {
      const d = DIFFICULTY[a.difficulty ?? "medium"] ?? DIFFICULTY['medium']!;
      const s = Math.max(0, Math.min(100, a.score + d.adjust));
      const age = Math.max(0, (now - +new Date(a.at)) / 86_400_000);
      const w = Math.pow(0.5, age / HALF_LIFE_DAYS) * d.weight;
      wSum += w; sSum += s * w; return s;
    });
    const score = Math.round(sSum / (wSum || 1));
    const n = adjusted.length;
    const mean = adjusted.reduce((x, y) => x + y, 0) / n;
    const spread = n > 1 ? Math.round(Math.sqrt(adjusted.reduce((x, y) => x + (y - mean) ** 2, 0) / n)) : 0;
    let trend: Trend = "New"; let delta = 0;
    if (n >= 2) {
      const recent = adjusted.slice(-Math.ceil(n / 2)); const earlier = adjusted.slice(0, n - recent.length);
      delta = Math.round(avg(recent) - avg(earlier.length ? earlier : [adjusted[0]!]));
      trend = delta >= 5 ? "Improving" : delta <= -5 ? "Declining" : "Steady";
    }
    const weakConcepts = concepts.filter((c) => normalizeTopic(c.topic) === topic && c.total >= 1 && c.correct / c.total < 0.6).sort((a, b) => a.correct / a.total - b.correct / b.total).map((c) => c.subtopic).slice(0, 3);
    const attention: Attention = score < 50 || (score < 60 && trend === "Declining") ? "High Attention" : score < 70 || spread > 20 || (trend === "Declining" && score < 80) ? "Needs Improvement" : "On Track";
    const signals: string[] = [`Performance indicator ${score}% from ${n} recorded attempt${n === 1 ? "" : "s"}, weighted towards recent results.`];
    const latest = sorted[sorted.length - 1]!;
    signals.push(`Latest: ${latest.score}% (${latest.source.toLowerCase()}${latest.difficulty ? `, ${latest.difficulty}` : ""}) on ${new Date(latest.at).toLocaleDateString()}.`);
    if (n >= 2) signals.push(`Trend: ${trend.toLowerCase()} (${delta >= 0 ? "+" : ""}${delta} points recent vs earlier).`);
    if (spread > 20) signals.push(`Inconsistent results: scores vary by about ±${spread} points.`);
    if (weakConcepts.length) signals.push(`Below 60% accuracy on: ${weakConcepts.join(", ")}.`);
    if (n < 2) signals.push("Only one attempt so far, so this estimate will firm up with more practice.");
    const minutes = attention === "High Attention" ? 45 : attention === "Needs Improvement" ? 30 : 15;
    const focus = weakConcepts.length ? `${topic} ${weakConcepts.join(" and ")}` : topic;
    const reason = attention === "On Track"
      ? `Consistent ${score}% across recent work${trend === "Improving" ? " and improving" : ""}.`
      : weakConcepts.length ? `Low accuracy in ${weakConcepts.join(" and ")} questions${trend === "Declining" ? ", and recent scores are falling" : ""}.`
      : spread > 20 && score >= 70 ? `Scores are uneven between attempts (±${spread} points).`
      : trend === "Declining" ? `Recent scores dropped by ${-delta} points.` : `Overall accuracy of ${score}% is below the 70% target.`;
    const action = attention === "On Track" ? `Keep momentum: a ${minutes}-minute ${topic} revision quiz this week.` : `Practice ${focus} problems for ${minutes} minutes, then retake a ${topic} assessment.`;
    out.push({ topic, score, trend, attention, attempts: n, reason, action, minutes, weakConcepts, signals, lastActivity: latest.at });
  }
  const rank: Record<Attention, number> = { "High Attention": 0, "Needs Improvement": 1, "On Track": 2 };
  return out.sort((a, b) => rank[a.attention] - rank[b.attention] || a.score - b.score);
}
const avg = (x: number[]) => x.reduce((a, b) => a + b, 0) / (x.length || 1);
