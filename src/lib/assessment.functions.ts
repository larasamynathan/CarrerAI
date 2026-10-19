import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ASSESSMENT_TOPICS = ["DSA", "Java", "Python", "SQL", "DBMS", "OOP", "Operating Systems", "Computer Networks", "Aptitude"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_COUNTS = [10, 15, 20] as const;
/** Seconds allowed per question by difficulty. */
export const SECONDS_PER_QUESTION: Record<string, number> = { easy: 60, medium: 75, hard: 90 };
const GRACE_SECONDS = 15;

export type PublicQuestion = { id: string; position: number; question: string; options: string[]; topic: string | null };
export type TopicScore = { topic: string; total: number; correct: number; incorrect: number; unanswered: number; score: number };
export type AssessmentSummary = {
  id: string; title: string; difficulty: string; status: string; topics: string[]; question_count: number | null; time_limit_seconds: number | null;
  time_taken_seconds: number | null; score: number | null; correct: number | null; incorrect: number | null; unanswered: number | null;
  accuracy: number | null; time_efficiency: number | null; topic_breakdown: TopicScore[]; started_at: string; completed_at: string | null;
};

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

async function ownAssessment(supabase: any, id: string) {
  const { data, error } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Assessment not found.");
  return data as AssessmentSummary & { user_id: string };
}

export const startAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ topics: z.array(z.enum(ASSESSMENT_TOPICS)).min(1).max(9), difficulty: z.enum(DIFFICULTIES), count: z.number().int().refine((n) => (QUESTION_COUNTS as readonly number[]).includes(n)) }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateQuestions } = await import("./assessment.server");
    const topics = [...new Set(data.topics)].slice(0, data.count);
    let questions;
    try { questions = await generateQuestions(topics, data.count, data.difficulty); }
    catch (e) { return { error: e instanceof Error ? e.message : "Questions could not be prepared.", id: null }; }
    const db = await admin();
    const limit = questions.length * (SECONDS_PER_QUESTION[data.difficulty] ?? 75);
    const title = topics.length === 1 ? `${topics[0]} assessment` : `Mixed assessment (${topics.length} topics)`;
    const { data: a, error } = await db.from("assessments").insert({
      user_id: context.userId, title, topic: topics.join(", "), topics, difficulty: data.difficulty, status: "in_progress",
      question_count: questions.length, time_limit_seconds: limit, started_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !a) return { error: "The assessment could not be started.", id: null };
    const { error: qErr } = await db.from("assessment_questions").insert(questions.map((q, i) => ({
      assessment_id: a.id, user_id: context.userId, position: i + 1, question: q.question, options: q.options, correct_answer: String(q.answer), explanation: q.explanation, topic: q.topic, subtopic: q.subtopic || null,
    })));
    if (qErr) { await db.from("assessments").delete().eq("id", a.id); return { error: "The assessment could not be started.", id: null }; }
    return { error: null, id: a.id as string };
  });

export const loadAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ownAssessment(context.supabase, data.id);
    const [{ data: qs }, { data: ans }] = await Promise.all([
      context.supabase.from("assessment_questions").select("id, position, question, options, topic").eq("assessment_id", data.id).order("position"),
      context.supabase.from("assessment_answers").select("question_id, selected_answer, marked_for_review").eq("assessment_id", data.id),
    ]);
    return {
      assessment: a,
      questions: (qs ?? []).map((q) => ({ ...q, options: (q.options as string[]) ?? [] })) as PublicQuestion[],
      answers: (ans ?? []).map((x) => ({ questionId: x.question_id, selected: x.selected_answer, marked: x.marked_for_review })),
      serverNow: new Date().toISOString(),
    };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assessmentId: z.string().uuid(), questionId: z.string().uuid(), selected: z.string().regex(/^[0-3]$/).nullable(), marked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ownAssessment(context.supabase, data.assessmentId);
    if (a.status !== "in_progress") return { ok: false, error: "This assessment is already submitted." };
    const elapsed = (Date.now() - new Date(a.started_at).getTime()) / 1000;
    if (elapsed > (a.time_limit_seconds ?? 0) + GRACE_SECONDS) return { ok: false, error: "Time is up for this assessment." };
    const { data: q } = await context.supabase.from("assessment_questions").select("id").eq("id", data.questionId).eq("assessment_id", a.id).maybeSingle();
    if (!q) return { ok: false, error: "Question not found." };
    const db = await admin();
    const { error } = await db.from("assessment_answers").upsert({
      assessment_id: a.id, question_id: q.id, user_id: context.userId, selected_answer: data.selected, marked_for_review: data.marked, answered_at: new Date().toISOString(),
    }, { onConflict: "question_id,user_id" });
    return { ok: !error, error: error ? "Your answer could not be saved." : null };
  });

export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ownAssessment(context.supabase, data.id);
    if (a.status === "completed") return { error: null };
    const db = await admin();
    const { grade } = await import("./assessment.server");
    const [{ data: qs }, { data: ans }] = await Promise.all([
      db.from("assessment_questions").select("id, topic, correct_answer").eq("assessment_id", a.id).eq("user_id", context.userId),
      db.from("assessment_answers").select("question_id, selected_answer").eq("assessment_id", a.id).eq("user_id", context.userId),
    ]);
    const limit = a.time_limit_seconds ?? 1;
    const used = Math.round((Date.now() - new Date(a.started_at).getTime()) / 1000);
    const g = grade(qs ?? [], new Map((ans ?? []).map((x) => [x.question_id, x.selected_answer])), used, limit);
    await Promise.all([...g.marks.entries()].map(([qid, ok]) => db.from("assessment_answers").update({ is_correct: ok }).eq("question_id", qid).eq("user_id", context.userId)));
    const { error } = await db.from("assessments").update({
      status: "completed", completed_at: new Date().toISOString(), time_taken_seconds: g.timeUsed, score: g.score, correct: g.correct, incorrect: g.incorrect,
      unanswered: g.unanswered, accuracy: g.accuracy, time_efficiency: g.timeEfficiency, topic_breakdown: g.topics,
    }).eq("id", a.id).eq("user_id", context.userId).eq("status", "in_progress");
    if (error) return { error: "Your assessment could not be submitted." };
    await db.from("assessment_results").insert(g.topics.map((t) => ({ user_id: context.userId, assessment_id: a.id, topic: t.topic, score: t.score, total: t.total, correct: t.correct })));
    const { runWeakAreaEngine } = await import("./weak-areas.server");
    await runWeakAreaEngine(context.supabase, context.userId);
    return { error: null };
  });

/** Correct answers and explanations are only released after submission. */
export const getAssessmentReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await ownAssessment(context.supabase, data.id);
    if (a.status !== "completed") throw new Error("Review is available after submission.");
    const db = await admin();
    const [{ data: qs }, { data: ans }] = await Promise.all([
      db.from("assessment_questions").select("id, position, question, options, topic, correct_answer, explanation").eq("assessment_id", a.id).eq("user_id", context.userId).order("position"),
      db.from("assessment_answers").select("question_id, selected_answer").eq("assessment_id", a.id).eq("user_id", context.userId),
    ]);
    const sel = new Map((ans ?? []).map((x) => [x.question_id, x.selected_answer]));
    return {
      assessment: a,
      review: (qs ?? []).map((q) => ({ id: q.id, position: q.position, question: q.question, options: (q.options as string[]) ?? [], topic: q.topic, correct: q.correct_answer, explanation: q.explanation, selected: sel.get(q.id) ?? null })),
    };
  });
