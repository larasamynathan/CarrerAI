import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Recomputes and stores the signed-in student's weak areas from their latest results. */
export const refreshWeakAreas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runWeakAreaEngine } = await import("./weak-areas.server");
    try { return { insights: await runWeakAreaEngine(context.supabase, context.userId), error: null }; }
    catch { return { insights: [], error: "Your weak areas could not be updated right now." }; }
  });
