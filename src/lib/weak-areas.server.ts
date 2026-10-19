import { analyzeTopics, type Attempt, type ConceptStat, type TopicInsight } from "./weak-areas.engine";

/**
 * Reads the student's own performance rows (RLS-scoped client), computes topic insights,
 * and stores them in weak_areas (source "engine") plus open recommendations.
 */
export async function runWeakAreaEngine(supabase: any, userId: string): Promise<TopicInsight[]> {
  const [res, asmt, ans, qs, practice, mocks] = await Promise.all([
    supabase.from("assessment_results").select("topic, score, created_at, assessment_id").eq("user_id", userId),
    supabase.from("assessments").select("id, difficulty").eq("user_id", userId),
    supabase.from("assessment_answers").select("question_id, is_correct").eq("user_id", userId).not("is_correct", "is", null),
    supabase.from("assessment_questions").select("id, topic, subtopic").eq("user_id", userId).not("subtopic", "is", null),
    supabase.from("practice_sessions").select("topic, score, completed_at, started_at").eq("user_id", userId).not("score", "is", null),
    supabase.from("mock_interviews").select("interview_type, overall_score, completed_at, started_at").eq("user_id", userId).not("overall_score", "is", null),
  ]);
  const diff = new Map<string, string>((asmt.data ?? []).map((a: any) => [a.id, a.difficulty]));
  const attempts: Attempt[] = [
    ...(res.data ?? []).map((r: any) => ({ topic: r.topic, score: r.score, at: r.created_at, difficulty: r.assessment_id ? diff.get(r.assessment_id) : null, source: "Assessment" as const })),
    ...(practice.data ?? []).map((p: any) => ({ topic: p.topic, score: p.score, at: p.completed_at ?? p.started_at, source: "Practice" as const })),
    ...(mocks.data ?? []).map((m: any) => ({ topic: `${m.interview_type} Interview`, score: m.overall_score, at: m.completed_at ?? m.started_at, source: "Mock interview" as const })),
  ].filter((a) => typeof a.score === "number" && a.topic);
  const qMap = new Map<string, { topic: string; subtopic: string }>((qs.data ?? []).map((q: any) => [q.id, { topic: q.topic, subtopic: q.subtopic }]));
  const cMap = new Map<string, ConceptStat>();
  for (const a of ans.data ?? []) {
    const q = qMap.get(a.question_id); if (!q?.topic || !q.subtopic) continue;
    const k = `${q.topic}|${q.subtopic.toLowerCase()}`;
    const c = cMap.get(k) ?? { topic: q.topic, subtopic: q.subtopic, correct: 0, total: 0 };
    c.total++; if (a.is_correct) c.correct++; cMap.set(k, c);
  }
  const insights = analyzeTopics(attempts, [...cMap.values()]);
  const now = new Date().toISOString();
  // Older per-assessment weak areas are superseded by the engine.
  await supabase.from("weak_areas").update({ resolved: true }).eq("user_id", userId).eq("source", "assessment").eq("resolved", false);
  const { data: existing } = await supabase.from("weak_areas").select("id, topic").eq("user_id", userId).eq("source", "engine");
  const ids = new Map<string, string>((existing ?? []).map((w: any) => [w.topic, w.id]));
  for (const t of insights) {
    const row = {
      score: t.score, trend: t.trend, attention: t.attention, reason: t.reason, recommended_action: t.action, signals: t.signals, attempts: t.attempts, evaluated_at: now,
      severity: t.attention === "High Attention" ? "high" : t.attention === "Needs Improvement" ? "medium" : "low", resolved: t.attention === "On Track", notes: t.reason,
    };
    let id = ids.get(t.topic);
    if (id) await supabase.from("weak_areas").update(row).eq("id", id);
    else { const { data } = await supabase.from("weak_areas").insert({ ...row, user_id: userId, topic: t.topic, source: "engine" }).select("id").single(); id = data?.id; }
    if (!id) continue;
    const { data: open } = await supabase.from("recommendations").select("id").eq("weak_area_id", id).eq("status", "open").maybeSingle();
    if (t.attention === "On Track") { if (open) await supabase.from("recommendations").update({ status: "done" }).eq("id", open.id); continue; }
    const rec = { title: `Practice ${t.topic}${t.weakConcepts.length ? `: ${t.weakConcepts.join(", ")}` : ""}`, description: `${t.reason} ${t.action}`, category: t.topic, priority: t.attention === "High Attention" ? 3 : 2, link: "/weak-areas" };
    if (open) await supabase.from("recommendations").update(rec).eq("id", open.id);
    else await supabase.from("recommendations").insert({ ...rec, user_id: userId, weak_area_id: id, status: "open" });
  }
  // Close recommendations from older assessment-based weak areas.
  const { data: stale } = await supabase.from("weak_areas").select("id").eq("user_id", userId).eq("source", "assessment");
  if (stale?.length) await supabase.from("recommendations").update({ status: "done" }).in("weak_area_id", stale.map((s: any) => s.id)).eq("status", "open");
  return insights;
}
