import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AtsFactorOut = { name: string; score: number; weight: number; detail: string };

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ profileId: z.string().uuid(), role: z.string().max(80), jobDescription: z.string().max(8000).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const { extractAndReview, scoreResume } = await import("./resume.server");
    const { supabase, userId } = context;
    const { data: prof, error } = await supabase.from("resume_profiles").select("id,raw_text").eq("id", data.profileId).eq("user_id", userId).maybeSingle();
    if (error || !prof) throw new Error("Resume not found.");
    const raw = prof.raw_text ?? "";
    if (raw.trim().length < 80) throw new Error("Not enough readable text was found in this resume. Try a text-based PDF or DOCX.");
    try {
      const { parsed, review } = await extractAndReview(raw, data.role);
      const s = scoreResume(raw, parsed, data.role, data.jobDescription);
      await supabase.from("resume_profiles").update({ parsed_data: parsed as any, updated_at: new Date().toISOString() }).eq("id", prof.id);
      const { data: row, error: e2 } = await supabase.from("resume_analysis").insert({
        user_id: userId, resume_profile_id: prof.id, overall_score: s.total, target_role: data.role,
        summary: parsed.summary || null, strengths: review.strengths, improvements: review.improvements, suggestions: review.suggestions,
        keywords: s.matched, missing_keywords: s.missing, ats_breakdown: s.factors as any,
      }).select("*").single();
      if (e2) throw new Error("The analysis could not be saved.");
      return { ok: true as const, analysisId: row.id };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "The resume could not be analyzed." };
    }
  });
