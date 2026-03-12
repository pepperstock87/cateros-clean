import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { createCainSession } from "@/lib/cain/service";
import { runCainChat } from "@/lib/cain/chat-engine";
import { registerDomainEventHandlers } from "@/lib/events";

export const maxDuration = 60;

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
    const { messages, constraints } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      constraints?: { maxBudget?: number; dietaryRestrictions?: string };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const org = await getCurrentOrg();
    const session = await createCainSession(user.id, org?.orgId || null);

    const stream = await runCainChat({
      userId: session.userId,
      orgId: session.orgId,
      companyName: session.companyContext.businessName ?? undefined,
      messages,
      constraints,
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
