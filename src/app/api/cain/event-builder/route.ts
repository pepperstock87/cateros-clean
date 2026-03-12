import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { createCainSession, runEventBuilder } from "@/lib/cain/service";
import { registerDomainEventHandlers } from "@/lib/events";

export const maxDuration = 60;

// Register domain event handlers on module load
registerDomainEventHandlers();

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
    const { brief, maxBudget, dietaryRestrictions, clientId } = body as {
      brief?: string;
      maxBudget?: number;
      dietaryRestrictions?: string;
      clientId?: string;
    };

    if (!brief || typeof brief !== "string" || !brief.trim()) {
      return new Response(
        JSON.stringify({ error: "A non-empty brief is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const org = await getCurrentOrg();

    // Initialize CAIN session with context and permissions
    const session = await createCainSession(user.id, org?.orgId || null);

    const stream = await runEventBuilder(session, {
      brief: brief.trim(),
      constraints: {
        maxBudget: maxBudget || undefined,
        dietaryRestrictions: dietaryRestrictions || undefined,
      },
      clientId: clientId || undefined,
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
