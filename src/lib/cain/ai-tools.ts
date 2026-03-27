// Vercel AI SDK tool definitions for CAIN
// Wraps the existing tool handlers from tools/index.ts

import { tool } from "ai";
import { z } from "zod";
import { executeTool } from "./tools";
import type { CainEventPlan, ExtractedEntities } from "./types";

type ToolContext = { userId: string; orgId: string | null };

// Side-channel state accumulated across tool calls within a single request
export interface CainToolState {
  plan: CainEventPlan | null;
  entityUpdates: Array<{ entities: Partial<ExtractedEntities>; fullSnapshot: ExtractedEntities }>;
  draftRecipes: Array<unknown>;
  shoppingList: unknown | null;
  prepPreview: unknown | null;
  marginAnalysis: unknown | null;
  procurementDraft: unknown | null;
}

export function createToolState(): CainToolState {
  return {
    plan: null,
    entityUpdates: [],
    draftRecipes: [],
    shoppingList: null,
    prepPreview: null,
    marginAnalysis: null,
    procurementDraft: null,
  };
}

// Creates a bridge function that calls executeTool and captures side-channel data
function makeExecute(ctx: ToolContext, state: CainToolState, toolName: string) {
  return async (input: Record<string, unknown>): Promise<string> => {
    const result = await executeTool(toolName, input, ctx);

    // Capture side-channel state
    if (result.plan) {
      result.plan.status = "ready";
      state.plan = result.plan;
    }
    if (result.entityUpdate) {
      state.entityUpdates.push({
        entities: result.entityUpdate,
        fullSnapshot: result.entityUpdate as unknown as ExtractedEntities,
      });
    }
    if (result.draftRecipes && result.draftRecipes.length > 0) {
      state.draftRecipes.push(...result.draftRecipes);
    }
    if (result.shoppingList) state.shoppingList = result.shoppingList;
    if (result.prepPreview) state.prepPreview = result.prepPreview;
    if (result.marginAnalysis) state.marginAnalysis = result.marginAnalysis;
    if (result.procurementDraft) state.procurementDraft = result.procurementDraft;

    return result.result;
  };
}

// Helper: creates a tool with schema + execute bridge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cainTool(description: string, inputSchema: z.ZodObject<any>, exec: (input: Record<string, unknown>) => Promise<string>) {
  return tool({
    description,
    inputSchema,
    execute: exec as never,
  });
}

export function buildCainTools(ctx: ToolContext, state: CainToolState) {
  const exec = (name: string) => makeExecute(ctx, state, name);

  return {
    lookup_recipes: cainTool(
      "Search the recipe database by keyword or category. Returns matching recipes with cost info.",
      z.object({
        query: z.string().optional().describe("Keyword to search recipe names/descriptions"),
        category: z.string().optional().describe("Filter by category (e.g. Appetizers, Mains, Sides, Desserts, Drinks)"),
      }),
      exec("lookup_recipes"),
    ),

    lookup_inventory: cainTool(
      "Check current inventory levels for specific ingredients.",
      z.object({
        ingredients: z.array(z.string()).optional().describe("List of ingredient names to look up"),
      }),
      exec("lookup_inventory"),
    ),

    lookup_staff: cainTool(
      "Get available staff members, optionally filtered by role.",
      z.object({
        role: z.string().optional().describe("Filter by role (e.g. chef, server, bartender)"),
      }),
      exec("lookup_staff"),
    ),

    lookup_clients: cainTool(
      "Search the client database by name, email, or company.",
      z.object({
        query: z.string().describe("Search term — matches against name, email, or company"),
      }),
      exec("lookup_clients"),
    ),

    lookup_past_events: cainTool(
      "Find similar past events by type and guest count range.",
      z.object({
        event_type: z.string().optional().describe("Event type filter"),
        guest_count_range: z.array(z.number()).length(2).optional().describe("[min, max] guest count"),
      }),
      exec("lookup_past_events"),
    ),

    lookup_staff_availability: cainTool(
      "Check which staff are booked on a specific date.",
      z.object({
        date: z.string().describe("Date to check (YYYY-MM-DD)"),
      }),
      exec("lookup_staff_availability"),
    ),

    lookup_venue: cainTool(
      "Look up venue details by name — capacity, amenities, access notes.",
      z.object({
        venue_name: z.string().describe("Venue name to search for"),
      }),
      exec("lookup_venue"),
    ),

    lookup_rental_items: cainTool(
      "Search rental item library by name or category.",
      z.object({
        query: z.string().optional().describe("Search term"),
        category: z.string().optional().describe("Category filter"),
      }),
      exec("lookup_rental_items"),
    ),

    get_business_defaults: cainTool(
      "Get admin fees, tax rates, margin targets, and business settings.",
      z.object({}),
      exec("get_business_defaults"),
    ),

    get_labor_report: cainTool(
      "Get labor cost report for a specific event.",
      z.object({
        event_id: z.string().describe("Event ID"),
      }),
      exec("get_labor_report"),
    ),

    get_qb_sync_status: cainTool(
      "Check QuickBooks sync status and recent activity.",
      z.object({}),
      exec("get_qb_sync_status"),
    ),

    get_payroll_status: cainTool(
      "Check payroll integration status and mapped employees.",
      z.object({}),
      exec("get_payroll_status"),
    ),

    compare_distributor_prices: cainTool(
      "Compare ingredient prices across connected distributors.",
      z.object({
        inventory_item_id: z.string().optional(),
        ingredient_name: z.string().optional(),
      }),
      exec("compare_distributor_prices"),
    ),

    get_distributor_spending: cainTool(
      "Get spending summary by distributor for a date range.",
      z.object({
        start_date: z.string().describe("Start date (YYYY-MM-DD)"),
        end_date: z.string().describe("End date (YYYY-MM-DD)"),
      }),
      exec("get_distributor_spending"),
    ),

    get_distributor_sync_status: cainTool(
      "Check distributor integration sync status.",
      z.object({
        distributor_id: z.string().optional(),
      }),
      exec("get_distributor_sync_status"),
    ),

    recommend_staffing: cainTool(
      "Get AI-recommended staffing levels based on event parameters.",
      z.object({
        guest_count: z.number().describe("Number of guests"),
        service_style: z.string().optional().describe("Service style (plated, buffet, cocktail, stations)"),
        event_type: z.string().optional(),
        event_duration_hours: z.number().optional(),
        menu_item_count: z.number().optional(),
        has_bar: z.boolean().optional(),
      }),
      exec("recommend_staffing"),
    ),

    recommend_rentals: cainTool(
      "Get AI-recommended rental items based on event parameters.",
      z.object({
        guest_count: z.number().describe("Number of guests"),
        service_style: z.string().optional(),
        event_type: z.string().optional(),
        venue_provides: z.array(z.string()).optional().describe("Items the venue provides"),
        menu_item_count: z.number().optional(),
      }),
      exec("recommend_rentals"),
    ),

    generate_draft_recipes: cainTool(
      "Generate AI draft recipes for menu items without existing recipe matches.",
      z.object({
        items: z.array(z.object({
          name: z.string(),
          category: z.string().optional(),
        })).describe("Menu items needing recipes"),
        guest_count: z.number().optional(),
        service_style: z.string().optional(),
      }),
      exec("generate_draft_recipes"),
    ),

    generate_shopping_list: cainTool(
      "Generate a categorized shopping list from menu items and recipes with inventory comparison.",
      z.object({
        menu_items: z.array(z.object({
          name: z.string(),
          recipe_id: z.string().optional(),
          quantity: z.number().optional(),
        })).describe("Menu items to shop for"),
        guest_count: z.number().describe("Number of guests"),
      }),
      exec("generate_shopping_list"),
    ),

    preview_prep_breakdown: cainTool(
      "Preview the kitchen prep breakdown organized by station and dish.",
      z.object({
        menu_items: z.array(z.object({
          name: z.string(),
          recipe_id: z.string().optional(),
          quantity: z.number().optional(),
        })),
        guest_count: z.number(),
      }),
      exec("preview_prep_breakdown"),
    ),

    produce_prep_sheet: cainTool(
      "Generate a production-ready prep sheet with tasks organized by station.",
      z.object({
        menu_items: z.array(z.object({
          name: z.string(),
          recipe_id: z.string().optional(),
          quantity: z.number().optional(),
          category: z.string().optional(),
        })),
        guest_count: z.number(),
        event_date: z.string().optional(),
        service_style: z.string().optional(),
      }),
      exec("produce_prep_sheet"),
    ),

    generate_timeline: cainTool(
      "Generate a structured day-of event timeline.",
      z.object({
        start_time: z.string().optional().describe("Event start time (HH:MM)"),
        end_time: z.string().optional().describe("Event end time (HH:MM)"),
        service_style: z.string().optional(),
        event_type: z.string().optional(),
        guest_count: z.number(),
        menu_item_count: z.number().optional(),
        has_bar: z.boolean().optional(),
        has_ceremony: z.boolean().optional(),
      }),
      exec("generate_timeline"),
    ),

    find_similar_patterns: cainTool(
      "Find past events similar to current plan for pattern extraction and pricing reference.",
      z.object({
        event_type: z.string().optional(),
        service_style: z.string().optional(),
        guest_count: z.number(),
        menu_item_count: z.number().optional(),
      }),
      exec("find_similar_patterns"),
    ),

    analyze_event_margin: cainTool(
      "Analyze profitability and cost structure. Returns margin breakdown and cost flags.",
      z.object({
        guest_count: z.number(),
        food_cost_total: z.number(),
        staffing_total: z.number(),
        rentals_total: z.number(),
        bar_total: z.number().optional(),
        subtotal: z.number(),
        admin_fee: z.number(),
        tax_amount: z.number(),
        total_cost: z.number(),
        suggested_price: z.number(),
        projected_margin: z.number(),
        target_margin_percent: z.number().optional(),
      }),
      exec("analyze_event_margin"),
    ),

    check_inventory_conflicts: cainTool(
      "Check if nearby events compete for the same inventory items.",
      z.object({
        event_date: z.string().describe("Event date (YYYY-MM-DD)"),
        ingredients: z.array(z.object({
          name: z.string(),
          quantity: z.number(),
          unit: z.string(),
        })),
      }),
      exec("check_inventory_conflicts"),
    ),

    generate_purchase_draft: cainTool(
      "Map shopping list to distributor products and generate purchase order lines.",
      z.object({
        shopping_items: z.array(z.object({
          ingredient_name: z.string(),
          quantity: z.number(),
          unit: z.string(),
        })),
      }),
      exec("generate_purchase_draft"),
    ),

    save_as_template: cainTool(
      "Save the current event plan as a reusable template.",
      z.object({
        template_name: z.string().describe("Name for the template"),
        template_description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      exec("save_as_template"),
    ),

    update_extracted_entities: cainTool(
      "Report what you have understood so far from the conversation. Call after processing each user message.",
      z.object({
        event: z.record(z.any()).optional().describe("Event details (name, date, type, guest_count, venue, etc.)"),
        client: z.record(z.any()).optional().describe("Client info (name, email, phone, company)"),
        menu: z.array(z.any()).optional().describe("Menu items extracted"),
        staffing: z.array(z.any()).optional().describe("Staffing needs extracted"),
        rentals: z.array(z.any()).optional().describe("Rental items extracted"),
        timeline: z.array(z.any()).optional().describe("Timeline items extracted"),
        budget: z.any().optional().describe("Budget info"),
        serviceStyle: z.any().optional().describe("Service style info"),
      }),
      exec("update_extracted_entities"),
    ),

    finalize_plan: cainTool(
      "Submit the complete structured event plan. Call this when you have enough data to build a plan. The user reviews and edits in the plan UI before committing.",
      z.object({
        plan: z.any().describe("The complete CainEventPlan object"),
      }),
      exec("finalize_plan"),
    ),
  };
}
