import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { createCainSession } from "@/lib/cain/service";
import { buildCainChatSystemPrompt } from "@/lib/cain/chat-system-prompt";
import { buildCainTools, createToolState } from "@/lib/cain/ai-tools";
import { DEFAULTS } from "@/lib/constants";
import { registerDomainEventHandlers } from "@/lib/events";
import { registerQBEventHandlers } from "@/lib/quickbooks";

export const maxDuration = 120;

registerDomainEventHandlers();
registerQBEventHandlers();

export async function POST(request: Request) {
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
    const { messages: uiMessages } = body as {
      messages: UIMessage[];
    };

    if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const org = await getCurrentOrg();
    const session = await createCainSession(user.id, org?.orgId || null);

    // Build context for system prompt
    const [recipeRes, staffRes, inventoryRes, settingsRes] = await Promise.all([
      supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("inventory").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("business_settings")
        .select("default_admin_fee, default_tax_rate, default_target_margin")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const systemPrompt = buildCainChatSystemPrompt({
      companyName: session.companyContext.businessName ?? undefined,
      adminPercent: settingsRes.data?.default_admin_fee ?? DEFAULTS.ADMIN_FEE_PERCENT,
      taxPercent: settingsRes.data?.default_tax_rate ?? DEFAULTS.TAX_RATE_PERCENT,
      marginPercent: settingsRes.data?.default_target_margin ?? DEFAULTS.PROFIT_MARGIN_PERCENT,
      recipeCount: recipeRes.count ?? 0,
      staffCount: staffRes.count ?? 0,
      inventoryItemCount: inventoryRes.count ?? 0,
    });

    // Tool state captures side-channel data (plan, entities, etc.)
    const toolState = createToolState();
    const ctx = { userId: user.id, orgId: session.orgId };
    const tools = buildCainTools(ctx, toolState);

    // Convert UIMessages to model messages for streamText
    const modelMessages = await convertToModelMessages(uiMessages);
    console.log(`[CAIN] Received ${uiMessages.length} UI messages, converted to ${modelMessages.length} model messages`);
    console.log(`[CAIN] Last user message parts:`, JSON.stringify(uiMessages[uiMessages.length - 1]?.parts?.slice(0, 2)));
    console.log(`[CAIN] Model messages:`, JSON.stringify(modelMessages.map(m => ({ role: m.role, contentLength: JSON.stringify(m.content).length }))));

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(15),
      onFinish: async () => {
        console.log(`[CAIN] Completed. Plan: ${toolState.plan ? "yes" : "no"}, entities: ${toolState.entityUpdates.length}`);
      },
      onError: ({ error }) => {
        console.error("[CAIN] Stream error:", error);
      },
    });

    // Return the UI message stream — includes text, tool calls, and tool results
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[CAIN] Route error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
