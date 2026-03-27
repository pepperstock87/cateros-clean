/**
 * POST /api/cain/proactive
 * Run proactive checks and propose actions
 * Auth required — returns actions proposed by rule
 */

import { createClient } from "@/lib/supabase/server";
import { runProactiveChecks } from "@/lib/cain/proactive";

export async function POST(request: Request) {
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

    // Run proactive checks
    const result = await runProactiveChecks(user.id, orgId);

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("Proactive check error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
