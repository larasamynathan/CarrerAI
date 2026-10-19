import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INTERVIEW_TYPES = ["Technical", "HR", "Behavioral"] as const;
export const INTERVIEW_LENGTHS = [5, 10] as const;
export const SECONDS_PER_ANSWER = 180;
const GRACE = 20;

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
async function own(supabase: any, id: string) {
  const { data } = await supabase.from("mock_interviews").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Interview not found.");
  return data;
}
const msg = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f);

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ type: z.enum(INTERVIEW_TYPES), role: z.string().trim().min(2).max(80), company: z.string().trim().max(80).optional(), count: z.number().int().refine((n) => (INTERVIEW_LENGTHS as readonly number[]).includes(n)) }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateInterviewQuestions } = await import("./mock-interview.server");
    let qs;
    try { qs = await generateInterviewQuestions(data.type, data.role, data.company || null, data.count); }
    catch (e) { return { id: null, error: msg(e, "The interview could not be started.") }; }
    const db = await admin();
    const { data: m, error } = await db.from("mock_interviews").insert({
      user_id: context.userId, role: data.role, company: data.company || null, interview_type: data.type, status: "in_progress",
      question_count: qs.length, seconds_per_question: SECONDS_PER_ANSWER, current_position: 1, started_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !m) return { id: null, error: "The interview could not be started." };
    const { error: qe } = await db.from("mock_interview_questions").insert(qs.map((q, i) => ({ mock_interview_id: m.id, user_id: context.userId, position: i + 1, question: q.question, focus: q.focus, question_key: q.key })));
    if (qe) { await db.from("mock_interviews").delete().eq("id", m.id); return { id: null, error: "The interview could not be started." }; }
    return { id: m.id as string, error: null };
  });

export const loadInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await own(context.supabase, data.id);
    const { data: qs } = await context.supabase.from("mock_interview_questions").select("id, position, question, focus, answer, feedback, score, evaluation, time_taken_seconds, answered_at").eq("mock_interview_id", data.id).order("position");
    const done = m.status === "completed";
    // Only questions already reached are revealed; later questions stay hidden.
    const visible = (qs ?? []).filter((q: any) => done || q.position <= m.current_position);
    return { interview: m, questions: visible, total: m.question_count ?? (qs ?? []).length, serverNow: new Date().toISOString() };
  });

export const submitInterviewAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), position: z.number().int().min(1), answer: z.string().max(6000), seconds: z.number().int().min(0).max(3600) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await own(context.supabase, data.id);
    if (m.status !== "in_progress") return { error: "This interview has already finished.", evaluation: null, next: null };
    if (data.position !== m.current_position) return { error: "This question has already been answered.", evaluation: null, next: null };
    const db = await admin();
    const { data: q } = await db.from("mock_interview_questions").select("id, question, answer").eq("mock_interview_id", data.id).eq("position", data.position).single();
    if (!q || q.answer != null) return { error: "This question has already been answered.", evaluation: null, next: null };
    const limit = m.seconds_per_question ?? SECONDS_PER_ANSWER;
    const seconds = Math.min(data.seconds, limit);
    const late = data.seconds > limit + GRACE;
    const { evaluateAnswer } = await import("./mock-interview.server");
    let ev;
    try { ev = await evaluateAnswer(m.interview_type, m.role, q.question, late ? "" : data.answer, seconds, limit); }
    catch (e) { return { error: msg(e, "The answer could not be evaluated."), evaluation: null, next: null }; }
    await db.from("mock_interview_questions").update({ answer: data.answer, score: ev.score, feedback: ev.feedback, evaluation: ev, time_taken_seconds: seconds, answered_at: new Date().toISOString() }).eq("id", q.id);
    const next = data.position < (m.question_count ?? 0) ? data.position + 1 : null;
    await db.from("mock_interviews").update({ current_position: next ?? data.position }).eq("id", data.id);
    return { error: null, evaluation: ev, next };
  });

export const finishInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await own(context.supabase, data.id);
    if (m.status === "completed") return { error: null };
    const db = await admin();
    const { data: qs } = await db.from("mock_interview_questions").select("question, focus, answer, evaluation").eq("mock_interview_id", data.id).order("position");
    const { buildReport } = await import("./mock-interview.server");
    const report = await buildReport(m.interview_type, m.role, qs ?? []);
    await db.from("mock_interviews").update({ status: "completed", completed_at: new Date().toISOString(), overall_score: report.overall, feedback: report.summary, report }).eq("id", data.id);
    try { const { runWeakAreaEngine } = await import("./weak-areas.server"); await runWeakAreaEngine(context.supabase, context.userId); } catch { /* engine refresh is best-effort */ }
    return { error: null };
  });
