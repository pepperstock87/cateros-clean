import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";
import { buildCainChatSystemPrompt } from "./chat-system-prompt";
import { cainTools, executeTool } from "./tools";
import type { CainEventPlan, CainDraftRecipe, CainShoppingList, CainPrepPreview, CainMarginAnalysis, CainProcurementDraft, CainProgressEvent, ExtractedEntities } from "./types";
import { createEntityState, mergeEntityUpdate, extractFromToolResult } from "./entity-extractor";

const MAX_ITERATIONS = 15;
const MODEL = "claude-opus-4-20250514";

export async function runCainChat(params: {
  userId: string;
  orgId: string | null;
  companyName?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: string;
  memoryContext?: string;
  constraints?: {
    maxBudget?: number;
    dietaryRestrictions?: string;
  };
}): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  function pushEvent(event: CainProgressEvent) {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    return writer.write(encoder.encode(line));
  }

  (async () => {
    try {
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

      const systemPrompt = buildCainChatSystemPrompt({
        companyName: params.companyName,
        adminPercent,
        taxPercent,
        marginPercent,
        recipeCount: recipeRes.count ?? 0,
        staffCount: staffRes.count ?? 0,
        inventoryItemCount: inventoryRes.count ?? 0,
        maxBudget: params.constraints?.maxBudget,
        dietaryRestrictions: params.constraints?.dietaryRestrictions,
        pageContext: params.pageContext,
        memoryContext: params.memoryContext,
      });

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        await pushEvent({ type: "error", message: "ANTHROPIC_API_KEY is not configured." });
        await writer.close();
        return;
      }

      const anthropic = new Anthropic({ apiKey });

      // Convert client messages to Anthropic format
      const anthropicMessages: Anthropic.MessageParam[] = params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let finalPlan: CainEventPlan | null = null;
      let entityState = createEntityState();
      let accumulatedDraftRecipes: CainDraftRecipe[] = [];
      let latestShoppingList: CainShoppingList | null = null;
      let latestPrepPreview: CainPrepPreview | null = null;
      let latestMarginAnalysis: CainMarginAnalysis | null = null;
      let latestProcurementDraft: CainProcurementDraft | null = null;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        console.log(`[CAIN] Iteration ${iteration + 1}/${MAX_ITERATIONS}, messages: ${anthropicMessages.length}`);

        // Use streaming so text reaches the client immediately
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: cainTools as unknown as Anthropic.Tool[],
          messages: anthropicMessages,
        });

        // Stream text deltas to the client as they arrive
        stream.on("text", (text) => {
          pushEvent({ type: "text_delta", text }).catch(() => {});
        });

        // Wait for the full response to collect tool calls
        const response = await stream.finalMessage();

        console.log(`[CAIN] Response: stop_reason=${response.stop_reason}, blocks=${response.content.length}`);
        const assistantContent = response.content;

        const toolUseBlocks = assistantContent.filter((b) => b.type === "tool_use");
        console.log(`[CAIN] Tool calls: ${toolUseBlocks.map((b) => b.type === "tool_use" ? b.name : "?").join(", ") || "none"}`);

        if (toolUseBlocks.length === 0) {
          if (finalPlan) {
            await pushEvent({ type: "plan_ready", plan: finalPlan });
          }
          break;
        }

        // Append assistant message
        anthropicMessages.push({ role: "assistant", content: assistantContent });

        // Execute tool calls
        const toolResults: Array<Anthropic.ToolResultBlockParam> = [];

        for (const block of toolUseBlocks) {
          if (block.type !== "tool_use") continue;
          const toolBlock = block as Anthropic.ToolUseBlock;

          await pushEvent({
            type: "tool_start",
            tool: toolBlock.name,
            input: toolBlock.input as Record<string, unknown>,
          });

          try {
            console.log(`[CAIN] Executing tool: ${toolBlock.name}`);
            const { result, plan, entityUpdate, draftRecipes, shoppingList, prepPreview, marginAnalysis, procurementDraft } = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              ctx
            );
            console.log(`[CAIN] Tool ${toolBlock.name} completed, result length: ${result.length}`);

            const summary =
              toolBlock.name === "finalize_plan"
                ? "Event plan finalized"
                : toolBlock.name === "update_extracted_entities"
                  ? "Entities updated"
                  : result.length > 200
                    ? result.slice(0, 200) + "..."
                    : result;

            await pushEvent({ type: "tool_result", tool: toolBlock.name, summary });

            if (plan) {
              finalPlan = plan;
              finalPlan.status = "ready";
              if (accumulatedDraftRecipes.length > 0) {
                finalPlan.draftRecipes = [
                  ...(finalPlan.draftRecipes || []),
                  ...accumulatedDraftRecipes,
                ];
              }
              if (latestShoppingList) {
                finalPlan.shoppingList = latestShoppingList;
              }
              if (latestPrepPreview) {
                finalPlan.prepPreview = latestPrepPreview;
              }
              if (latestMarginAnalysis) {
                finalPlan.marginAnalysis = latestMarginAnalysis;
              }
              if (latestProcurementDraft) {
                finalPlan.procurementDraft = latestProcurementDraft;
              }
            }

            if (draftRecipes && draftRecipes.length > 0) {
              accumulatedDraftRecipes = [...accumulatedDraftRecipes, ...draftRecipes];
            }

            if (shoppingList) {
              latestShoppingList = shoppingList;
            }

            if (prepPreview) {
              latestPrepPreview = prepPreview;
            }

            if (procurementDraft) {
              latestProcurementDraft = procurementDraft;
            }

            if (marginAnalysis) {
              latestMarginAnalysis = marginAnalysis;
              await pushEvent({ type: "margin_analysis", analysis: marginAnalysis });
            }

            // Handle entity updates from the explicit tool
            if (entityUpdate) {
              entityState = mergeEntityUpdate(entityState, entityUpdate);
              await pushEvent({
                type: "entity_update",
                entities: entityUpdate,
                fullSnapshot: entityState,
              });
            } else {
              // Try deterministic extraction from other tool results
              const extracted = extractFromToolResult(
                toolBlock.name,
                toolBlock.input as Record<string, unknown>,
                result,
                entityState
              );
              if (extracted) {
                entityState = mergeEntityUpdate(entityState, extracted);
                await pushEvent({
                  type: "entity_update",
                  entities: extracted,
                  fullSnapshot: entityState,
                });
              }
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: result,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown tool error";
            console.error(`[CAIN] Tool ${toolBlock.name} FAILED:`, err);
            await pushEvent({ type: "tool_result", tool: toolBlock.name, summary: `Error: ${errorMsg}` });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: `Error executing tool: ${errorMsg}`,
              is_error: true,
            });
          }
        }

        anthropicMessages.push({ role: "user", content: toolResults });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[CAIN] Fatal error in chat loop:", err);
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
