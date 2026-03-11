import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { runCainEventBuilder } from "@/lib/cain/engine";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          error: "AI features require configuration. Please set up your ANTHROPIC_API_KEY.",
          code: "AI_NOT_CONFIGURED",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { brief } = body as { brief?: string };

    if (!brief || typeof brief !== "string" || !brief.trim()) {
      return new Response(
        JSON.stringify({ error: "A non-empty brief is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user profile for company name
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", user.id)
      .single();

    const org = await getCurrentOrg();

    const stream = await runCainEventBuilder({
      userId: user.id,
      orgId: org?.orgId || null,
      brief: brief.trim(),
      companyName: profile?.company_name || undefined,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
