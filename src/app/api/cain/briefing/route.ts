/**
 * GET /api/cain/briefing
 * Generate and return weekly operations briefing
 * Auth required
 */

import { createClient } from "@/lib/supabase/server";
import { generateWeeklyBriefing } from "@/lib/cain/orchestration";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org context if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id || null;

    // Optional: get week start date from query params
    const url = new URL(request.url);
    const weekStartDate = url.searchParams.get("weekStartDate") || undefined;

    // Generate briefing
    const briefing = await generateWeeklyBriefing(user.id, orgId, weekStartDate);

    return Response.json(briefing, { status: 200 });
  } catch (error) {
    console.error("Weekly briefing error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
