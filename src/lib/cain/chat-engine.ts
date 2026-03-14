import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";
import { buildCainChatSystemPrompt } from "./chat-system-prompt";
import { cainTools, executeTool } from "./tools";
import type { CainEventPlan, CainDraftRecipe, CainShoppingList, CainPrepPreview, CainMarginAnalysis, CainProcurementDraft, CainProgressEvent, ExtractedEntities } from "./types";
import { createEntityState, mergeEntityUpdate, extractFromToolResult } from "./entity-extractor";

const MAX_ITERATIONS = 15;
const MODEL = "claude-sonnet-4-20250514";

export async function runCainChat(params: {
  userId: string;
  orgId: string | null;
  companyName?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
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
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: cainTools as unknown as Anthropic.Tool[],
          messages: anthropicMessages,
        });

        const assistantContent = response.content;

        // Push text blocks as deltas
        for (const block of assistantContent) {
          if (block.type === "text" && block.text) {
            await pushEvent({ type: "text_delta", text: block.text });
          }
        }

        const toolUseBlocks = assistantContent.filter((b) => b.type === "tool_use");

        if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
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
            const { result, plan, entityUpdate, draftRecipes, shoppingList, prepPreview, marginAnalysis, procurementDraft } = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              ctx
            );

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
              // Attach accumulated draft recipes to the plan
              if (accumulatedDraftRecipes.length > 0) {
                finalPlan.draftRecipes = [
                  ...(finalPlan.draftRecipes || []),
                  ...accumulatedDraftRecipes,
                ];
              }
              // Attach shopping list to the plan
              if (latestShoppingList) {
                finalPlan.shoppingList = latestShoppingList;
              }
              // Attach prep preview to the plan
              if (latestPrepPreview) {
                finalPlan.prepPreview = latestPrepPreview;
              }
              // Attach margin analysis to the plan
              if (latestMarginAnalysis) {
                finalPlan.marginAnalysis = latestMarginAnalysis;
              }
              // Attach procurement draft to the plan
              if (latestProcurementDraft) {
                finalPlan.procurementDraft = latestProcurementDraft;
              }
            }

            // Accumulate draft recipes from generate_draft_recipes tool
            if (draftRecipes && draftRecipes.length > 0) {
              accumulatedDraftRecipes = [...accumulatedDraftRecipes, ...draftRecipes];
            }

            // Track shopping list from generate_shopping_list tool
            if (shoppingList) {
              latestShoppingList = shoppingList;
            }

            // Track prep preview from preview_prep_breakdown tool
            if (prepPreview) {
              latestPrepPreview = prepPreview;
            }

            // Track procurement draft from generate_purchase_draft tool
            if (procurementDraft) {
              latestProcurementDraft = procurementDraft;
            }

            // Track margin analysis from analyze_event_margin tool
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
