import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CoachSource = { title: string; category: string | null; topic: string | null; subtopic?: string | null; difficulty: string | null; source: string | null; similarity: number; excerpt: string };
export type AnswerMode = "knowledge" | "personal" | "general";
export type CoachMeta = { mode?: AnswerMode; topic?: string | null; contextCount?: number };
export type CoachReply = { sessionId: string; answer: string; grounded: boolean; personalized: boolean; sources: CoachSource[]; meta: CoachMeta; error?: string | undefined };
export type CoachMessage = { role: string; content: string; sources: CoachSource[]; meta: CoachMeta };
export type CoachSessionSummary = { id: string; title: string; updated_at: string };

export const KNOWLEDGE_CATEGORIES = [
  "Data Structures and Algorithms", "Java", "Python", "SQL", "DBMS", "Operating Systems", "Computer Networks", "OOP",
  "Software Engineering", "Aptitude", "HR Interviews", "Technical Interviews", "Resume Preparation", "Placement Preparation",
] as const;

const INSUFFICIENT = "I couldn't find enough relevant information in the current placement knowledge base to answer this reliably.";
const PERSONAL = /\b(my|me|i|mine|today|plan|weak|practice|prepare|should)\b/i;


async function studentSnapshot(supabase: any, userId: string): Promise<string> {
  const [p, w, r, s, t, m, ra] = await Promise.all([
    supabase.from("profiles").select("target_role,target_company,degree,branch,graduation_year").eq("user_id", userId).maybeSingle(),
    supabase.from("weak_areas").select("topic,severity").eq("user_id", userId).eq("resolved", false).limit(8),
    supabase.from("assessment_results").select("topic,score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
    supabase.from("skills").select("name,proficiency").eq("user_id", userId).limit(15),
    supabase.from("preparation_plans").select("title,category,due_date").eq("user_id", userId).eq("completed", false).limit(8),
    supabase.from("mock_interviews").select("role,overall_score").eq("user_id", userId).not("overall_score", "is", null).limit(3),
    supabase.from("resume_analysis").select("overall_score").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);
  const lines: string[] = [];
  const pr = p.data;
  if (pr && (pr.target_role || pr.target_company)) lines.push(`Target: ${pr.target_role || "—"} at ${pr.target_company || "—"}${pr.branch ? `, ${pr.branch}` : ""}${pr.graduation_year ? `, graduating ${pr.graduation_year}` : ""}`);
  if (w.data?.length) lines.push(`Open weak areas: ${w.data.map((x: any) => `${x.topic} (${x.severity})`).join(", ")}`);
  if (r.data?.length) lines.push(`Recent assessments: ${r.data.map((x: any) => `${x.topic} ${x.score}%`).join(", ")}`);
  if (s.data?.length) lines.push(`Self-rated skills: ${s.data.map((x: any) => `${x.name} ${x.proficiency}%`).join(", ")}`);
  if (t.data?.length) lines.push(`Pending plan tasks: ${t.data.map((x: any) => `${x.title}${x.due_date ? ` (due ${x.due_date})` : ""}`).join(", ")}`);
  if (m.data?.length) lines.push(`Mock interview scores: ${m.data.map((x: any) => `${x.role} ${x.overall_score}%`).join(", ")}`);
  if (ra.data?.[0]?.overall_score != null) lines.push(`Latest resume score: ${ra.data[0].overall_score}%`);
  return lines.join("\n");
}

export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ question: z.string().min(1).max(2000), sessionId: z.string().uuid().nullable(), category: z.string().nullable(), retry: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<CoachReply> => {
    const { supabase, userId } = context;
    const rag = await import("./rag.server");
    const question = rag.processQuery(data.question);

    let sessionId = data.sessionId;
    if (!sessionId) {
      const { data: s, error } = await supabase.from("chat_sessions").insert({ user_id: userId, title: question.slice(0, 80) }).select("id").single();
      if (error) throw new Error("Could not start a conversation.");
      sessionId = s.id;
    }
    const { data: past } = await supabase.from("chat_messages").select("role,content,created_at").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(10);
    if (!data.retry) {
      const { error } = await supabase.from("chat_messages").insert({ session_id: sessionId, user_id: userId, role: "user", content: question });
      if (error) throw new Error("Could not save your message.");
    }
    const history = (past ?? []).reverse().filter((m) => m.role === "user" || m.role === "assistant") as { role: "user" | "assistant"; content: string }[];
    const priorHistory = data.retry && history.at(-1)?.role === "user" ? history.slice(0, -1) : history;

    try {
      // 1. Query understanding (follow-up resolution + domain detection) — runs for every message, chips included.
      const [understood, profile] = await Promise.all([rag.understandQuery(question, priorHistory), studentSnapshot(supabase, userId)]);
      // 2. Embedding of the standalone query  3. Vector similarity search
      const embedding = await rag.embedQuery(understood.query);
      const { data: rows, error } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: `[${embedding.join(",")}]`, match_count: 12, ...(data.category ? { filter_category: data.category } : {}),
      });
      if (error) throw new Error("Knowledge search failed.");
      // 4. Threshold + domain-aware rerank
      const relevant = rag.rerank((rows ?? []) as import("./rag.server").RetrievedChunk[], data.category || understood.domain);
      const sources: CoachSource[] = relevant.map((r) => ({ title: r.title, category: r.category, topic: r.topic, subtopic: r.subtopic ?? null, difficulty: r.difficulty, source: r.source, similarity: Math.round(r.similarity * 100) / 100, excerpt: r.content.slice(0, 220) }));
      const usePersonal = !!profile && PERSONAL.test(question);
      const topic = understood.domain ?? relevant[0]?.category ?? null;

      // 5. Context construction + grounded generation, or a clearly labelled general answer.
      let answer: string; let mode: AnswerMode;
      if (relevant.length || usePersonal) {
        answer = await rag.generateGroundedAnswer(question, relevant, priorHistory, usePersonal ? profile : "");
        mode = relevant.length ? "knowledge" : "personal";
      } else {
        const general = await rag.generateGeneralAnswer(question, priorHistory);
        answer = `${INSUFFICIENT}\n\nGeneral AI answer (not from the CareerAI knowledge base):\n${general}`;
        mode = "general";
      }
      const meta: CoachMeta = { mode, topic, contextCount: relevant.length };
      const { error: saveErr } = await supabase.from("chat_messages").insert({ session_id: sessionId, user_id: userId, role: "assistant", content: answer, sources, meta });
      if (saveErr) console.error("coach: failed to save reply", saveErr.message);
      await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      return { sessionId, answer, grounded: relevant.length > 0, personalized: usePersonal, sources, meta };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "The coach is unavailable right now.";
      return { sessionId, answer: "", grounded: false, personalized: false, sources: [], meta: {}, error: msg };
    }
  });

export const listCoachSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachSessionSummary[]> => {
    const { data } = await context.supabase.from("chat_sessions").select("id,title,updated_at").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(30);
    return data ?? [];
  });

export const getCoachSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CoachMessage[]> => {
    const { data: rows } = await context.supabase.from("chat_messages").select("role,content,sources,meta").eq("session_id", data.sessionId).eq("user_id", context.userId).order("created_at");
    return (rows ?? []).map((m) => ({ role: m.role, content: m.content, sources: (m.sources ?? []) as CoachSource[], meta: (m.meta ?? {}) as CoachMeta }));
  });

export const deleteCoachSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await supabase.from("chat_messages").delete().eq("session_id", data.sessionId).eq("user_id", userId);
    if (m.error) throw new Error("Could not clear the conversation.");
    const s = await supabase.from("chat_sessions").delete().eq("id", data.sessionId).eq("user_id", userId);
    if (s.error) throw new Error("Could not clear the conversation.");
    return { ok: true };
  });
