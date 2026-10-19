// Pure, deterministic analytics derived only from a student's real rows. Never invents history.
export type AnalyticsInput = {
  results: { id: string; topic: string; score: number; correct: number; total: number; created_at: string }[];
  answers: { is_correct: boolean | null; answered_at: string; selected_answer: string | null }[];
  practiceSessions: { id: string; topic: string; session_type: string; duration_minutes: number | null; score: number | null; started_at: string; completed_at: string | null }[];
  mockInterviews: { id: string; role: string; interview_type: string; status: string; overall_score: number | null; started_at: string; completed_at: string | null }[];
  resumeAnalyses: { id: string; overall_score: number | null; created_at: string }[];
  skills: { name: string; category: string; proficiency: number }[];
};

const DAY = 86_400_000;
const avg = (v: number[]) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function latestPerTopic<T extends { topic: string; created_at: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) { const cur = map.get(r.topic); if (!cur || r.created_at > cur.created_at) map.set(r.topic, r); }
  return [...map.values()];
}

/** Same readiness formula as the dashboard: average of measured signals; null when nothing is measured. */
export function readiness(input: AnalyticsInput) {
  const latest = latestPerTopic(input.results);
  const scoreFor = (aliases: string[]) => avg([
    ...input.skills.filter(s => aliases.some(a => `${s.name} ${s.category}`.toLowerCase().includes(a))).map(s => s.proficiency),
    ...latest.filter(r => aliases.some(a => r.topic.toLowerCase().includes(a))).map(r => r.score),
  ]);
  const interview = avg(input.mockInterviews.filter(m => m.overall_score !== null).map(m => m.overall_score as number));
  const areas = [
    scoreFor(['data structure', 'algorithm', 'dsa']), scoreFor(['java']), scoreFor(['database', 'sql']),
    scoreFor(['operating system', 'network', 'core cs', 'computer']), scoreFor(['aptitude', 'quantitative', 'reasoning']),
    scoreFor(['communication', 'behavioral', 'soft skill']), interview,
  ];
  const resume = [...input.resumeAnalyses].sort((a, b) => b.created_at.localeCompare(a.created_at)).find(r => r.overall_score !== null)?.overall_score ?? null;
  const measured = [...areas, resume].filter((v): v is number => v !== null);
  return { score: avg(measured), signals: measured.length };
}

/** Distinct UTC days with any recorded activity. */
export function activityDays(input: AnalyticsInput): Set<string> {
  const days = new Set<string>();
  const add = (iso: string | null) => { if (iso) days.add(iso.slice(0, 10)); };
  input.results.forEach(r => add(r.created_at));
  input.answers.forEach(a => add(a.answered_at));
  input.practiceSessions.forEach(p => add(p.completed_at ?? p.started_at));
  input.mockInterviews.forEach(m => add(m.completed_at));
  input.resumeAnalyses.forEach(r => add(r.created_at));
  return days;
}

/** Consecutive active days ending today (or yesterday, so the streak survives until today ends). */
export function practiceStreak(days: Set<string>, now = new Date()) {
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let current = 0;
  while (days.has(dayKey(cursor))) { current++; cursor = new Date(cursor.getTime() - DAY); }
  const sorted = [...days].sort();
  let longest = 0, run = 0, prev: number | null = null;
  for (const d of sorted) { const t = Date.parse(d); run = prev !== null && t - prev === DAY ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }
  return { current, longest, activeDays: days.size };
}

/** Activities per week for the last `weeks` weeks (Monday-start, UTC). */
export function weeklyPractice(input: AnalyticsInput, weeks = 8, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = monday - (weeks - 1 - i) * 7 * DAY;
    return { start, label: new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }), assessments: 0, interviews: 0, practice: 0, minutes: 0 };
  });
  const place = (iso: string | null, key: 'assessments' | 'interviews' | 'practice', minutes = 0) => {
    if (!iso) return; const t = Date.parse(iso);
    const b = buckets.find(x => t >= x.start && t < x.start + 7 * DAY); if (b) { b[key]++; b.minutes += minutes; }
  };
  input.results.forEach(r => place(r.created_at, 'assessments'));
  input.mockInterviews.forEach(m => place(m.completed_at, 'interviews'));
  input.practiceSessions.forEach(p => place(p.completed_at ?? p.started_at, 'practice', p.duration_minutes ?? 0));
  return buckets.map(({ start: _s, ...b }) => b);
}

export function topicPerformance(input: AnalyticsInput) {
  const by = new Map<string, number[]>();
  input.results.forEach(r => by.set(r.topic, [...(by.get(r.topic) ?? []), r.score]));
  return [...by.entries()].map(([topic, s]) => ({ topic, average: avg(s) as number, attempts: s.length })).sort((a, b) => b.average - a.average);
}

export function assessmentTrend(input: AnalyticsInput) {
  return [...input.results].sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r, i) => ({ n: i + 1, label: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), score: r.score, topic: r.topic }));
}

/** First vs latest score for every topic attempted at least twice — real improvement only. */
export function skillImprovement(input: AnalyticsInput) {
  const by = new Map<string, { created_at: string; score: number }[]>();
  input.results.forEach(r => by.set(r.topic, [...(by.get(r.topic) ?? []), r]));
  return [...by.entries()].filter(([, rows]) => rows.length >= 2).map(([topic, rows]) => {
    const s = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = s[0]!.score, latest = s[s.length - 1]!.score;
    return { topic, first, latest, change: latest - first };
  }).sort((a, b) => b.change - a.change);
}

export function questionsSolved(input: AnalyticsInput) {
  const attempted = input.answers.filter(a => a.selected_answer !== null);
  const correct = attempted.filter(a => a.is_correct === true).length;
  return { attempted: attempted.length, correct, accuracy: attempted.length ? Math.round((correct / attempted.length) * 100) : null };
}

export type TimelineEvent = { at: string; kind: 'assessment' | 'interview' | 'practice' | 'resume'; title: string; detail: string };
export function progressTimeline(input: AnalyticsInput, limit = 12): TimelineEvent[] {
  const ev: TimelineEvent[] = [
    ...input.results.map(r => ({ at: r.created_at, kind: 'assessment' as const, title: `${r.topic} assessment`, detail: `Scored ${r.score}% · ${r.correct}/${r.total} correct` })),
    ...input.mockInterviews.filter(m => m.completed_at).map(m => ({ at: m.completed_at as string, kind: 'interview' as const, title: `${m.interview_type} mock interview`, detail: `${m.role}${m.overall_score !== null ? ` · ${m.overall_score}/100` : ''}` })),
    ...input.practiceSessions.map(p => ({ at: p.completed_at ?? p.started_at, kind: 'practice' as const, title: `${p.session_type} · ${p.topic}`, detail: [p.duration_minutes ? `${p.duration_minutes} min` : null, p.score !== null ? `${p.score}%` : null, p.completed_at ? 'Completed' : 'Started'].filter(Boolean).join(' · ') })),
    ...input.resumeAnalyses.map(r => ({ at: r.created_at, kind: 'resume' as const, title: 'Resume analyzed', detail: r.overall_score !== null ? `Estimated score ${r.overall_score}/100` : 'Analysis saved' })),
  ];
  return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
