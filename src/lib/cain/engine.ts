import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";
import { buildCainSystemPrompt } from "./system-prompt";
import { cainTools, executeTool } from "./tools";
import type { CainEventPlan, CainProgressEvent } from "./types";

const MAX_ITERATIONS = 15;
const MODEL = "claude-sonnet-4-20250514";

export async function runCainEventBuilder(params: {
  userId: string;
  orgId: string | null;
  brief: string;
  companyName?: string;
  constraints?: {
    maxBudget?: number;
    dietaryRestrictions?: string;
  };
  /** Pre-built context string from CAIN memory (client history, event state, etc.) */
  contextString?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Helper to push an SSE event
  function pushEvent(event: CainProgressEvent) {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    return writer.write(encoder.encode(line));
  }

  // Run the agentic loop in the background so we can return the stream immediately
  (async () => {
    try {
      // --- Gather context counts ---
      const supabase = await createClient();
      const ctx = { userId: params.userId, orgId: params.orgId };

      const [recipeRes, staffRes, inventoryRes, settingsRes] = await Promise.all([
        supabase
          .from("recipes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", params.userId),
        supabase
          .from("staff_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", params.userId),
        supabase
          .from("inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", params.userId),
        supabase
          .from("business_settings")
          .select("default_admin_fee, default_tax_rate, default_target_margin")
          .eq("user_id", params.userId)
          .maybeSingle(),
      ]);

      const adminPercent =
        settingsRes.data?.default_admin_fee ?? DEFAULTS.ADMIN_FEE_PERCENT;
      const taxPercent =
        settingsRes.data?.default_tax_rate ?? DEFAULTS.TAX_RATE_PERCENT;
      const marginPercent =
        settingsRes.data?.default_target_margin ?? DEFAULTS.PROFIT_MARGIN_PERCENT;

      const systemPrompt = buildCainSystemPrompt({
        companyName: params.companyName,
        adminPercent,
        taxPercent,
        marginPercent,
        recipeCount: recipeRes.count ?? 0,
        staffCount: staffRes.count ?? 0,
        inventoryItemCount: inventoryRes.count ?? 0,
        maxBudget: params.constraints?.maxBudget,
        dietaryRestrictions: params.constraints?.dietaryRestrictions,
      });

      // --- Initialize Anthropic client ---
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        await pushEvent({
          type: "error",
          message: "ANTHROPIC_API_KEY is not configured.",
        });
        await writer.close();
        return;
      }

      const anthropic = new Anthropic({ apiKey });

      await pushEvent({ type: "thinking", message: "Analyzing your event brief..." });

      // --- Build user message with constraints ---
      let userMessage = params.brief;
      const constraintParts: string[] = [];
      if (params.constraints?.maxBudget) {
        constraintParts.push(`Maximum budget: $${params.constraints.maxBudget.toLocaleString()}`);
      }
      if (params.constraints?.dietaryRestrictions) {
        constraintParts.push(`Dietary restrictions: ${params.constraints.dietaryRestrictions}`);
      }
      if (constraintParts.length > 0) {
        userMessage += `\n\n**Constraints:**\n${constraintParts.join("\n")}`;
      }

      // Inject pre-built context if available (client history, event state, etc.)
      if (params.contextString) {
        userMessage += `\n\n---\n\n${params.contextString}`;
      }

      // --- Agentic tool-use loop ---
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: userMessage },
      ];

      let finalPlan: CainEventPlan | null = null;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 8192,
          system: systemPrompt,
          tools: cainTools as unknown as Anthropic.Tool[],
          messages,
        });

        // Collect assistant content blocks
        const assistantContent = response.content;

        // Push any text blocks as deltas
        for (const block of assistantContent) {
          if (block.type === "text" && block.text) {
            await pushEvent({ type: "text_delta", text: block.text });
          }
        }

        // If no tool use, we're done
        const toolUseBlocks = assistantContent.filter(
          (b) => b.type === "tool_use"
        );

        if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
          // No more tool calls — done
          if (!finalPlan) {
            await pushEvent({
              type: "error",
              message:
                "The AI finished without producing a structured plan. Please try rephrasing your brief.",
            });
          }
          break;
        }

        // Append assistant message
        messages.push({ role: "assistant", content: assistantContent });

        // Execute each tool call
        const toolResults: Anthropic.MessageParam["content"] & Array<unknown> = [];

        for (const block of toolUseBlocks) {
          if (block.type !== "tool_use") continue;
          const toolBlock = block as Anthropic.ToolUseBlock;

          await pushEvent({
            type: "tool_start",
            tool: toolBlock.name,
            input: toolBlock.input as Record<string, unknown>,
          });

          try {
            const { result, plan } = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              ctx
            );

            // Summarize for the progress stream
            const summary =
              toolBlock.name === "finalize_plan"
                ? "Event plan finalized"
                : result.length > 200
                  ? result.slice(0, 200) + "..."
                  : result;

            await pushEvent({
              type: "tool_result",
              tool: toolBlock.name,
              summary,
            });

            if (plan) {
              finalPlan = plan;
              finalPlan.status = "ready";
              await pushEvent({ type: "plan_ready", plan: finalPlan });
            }

            toolResults.push({
              type: "tool_result" as const,
              tool_use_id: toolBlock.id,
              content: result,
            });
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : "Unknown tool error";
            await pushEvent({
              type: "tool_result",
              tool: toolBlock.name,
              summary: `Error: ${errorMsg}`,
            });

            toolResults.push({
              type: "tool_result" as const,
              tool_use_id: toolBlock.id,
              content: `Error executing tool: ${errorMsg}`,
              is_error: true,
            });
          }
        }

        // Append tool results
        messages.push({ role: "user", content: toolResults });

        // If we got the final plan, let the model do one more turn to wrap up,
        // but if it already produced the plan we can break after that turn
        if (finalPlan) {
          // One more iteration to let the model respond after finalize_plan
          // It will likely end_turn
        }
      }

      if (!finalPlan) {
        await pushEvent({
          type: "error",
          message: "Reached maximum iterations without a finalized plan.",
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      try {
        await pushEvent({ type: "error", message });
      } catch {
        // Writer may already be closed
      }
    } finally {
      try {
        await writer.close();
      } catch {
        // Already closed
      }
    }
  })();

  return readable;
}
