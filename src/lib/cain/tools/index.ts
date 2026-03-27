import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";
import { getEventLaborReport } from "@/lib/payroll/labor-report";
import { getConnection as getQBConnection } from "@/lib/quickbooks/auth";
import { getRecentSyncLogs } from "@/lib/quickbooks/queue";
import { getConnection as getPayrollConnection } from "@/lib/payroll/auth";
import { getAllMappings as getPayrollMappings } from "@/lib/payroll/mapping";
import { getProductOptions } from "@/lib/distributors/mapping";
import { getSpendingSummary } from "@/lib/distributors/reconciliation";
import { getRecentSyncJobs } from "@/lib/distributors/sync";
import type { CainEventPlan, CainDraftRecipe, CainShoppingList, CainPrepPreview, CainMarginAnalysis, CainProcurementDraft, ExtractedEntities } from "../types";
import { normalizeToolUpdate } from "../entity-extractor";
import { generateDraftRecipes } from "../recipe-generator";
import { aggregateIngredients, compareWithInventory, buildShoppingList } from "../shopping-aggregator";
import { buildPrepPreview } from "../prep-preview";
import { recommendStaffing } from "../staffing-recommender";
import { recommendRentals } from "../rental-recommender";
import { analyzeMargin, compareToPastEvents, addComparisonFlags } from "../margin-analyzer";
import { computeNetPurchaseList, detectInventoryConflicts } from "../inventory-planner";
import { generateTimeline } from "../timeline-generator";
import { extractPatterns } from "../pattern-matcher";
import { buildProcurementDraft } from "../procurement-builder";
import { writeToolDefinitions, executeWriteTool } from "./write-tools";

// ---------- Anthropic tool definitions ----------

export const cainTools = [
  {
    name: "lookup_recipes",
    description:
      "Search the recipe database by keyword or category. Returns matching recipes with cost info.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Keyword to search recipe names/descriptions",
        },
        category: {
          type: "string",
          description:
            "Filter by category (e.g. Appetizers, Mains, Sides, Desserts, Drinks)",
        },
      },
      required: [],
    },
  },
  {
    name: "lookup_inventory",
    description:
      "Check current inventory levels for specific ingredients. Returns quantity on hand, unit, and par level.",
    input_schema: {
      type: "object" as const,
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredient names to look up",
        },
      },
      required: [],
    },
  },
  {
    name: "lookup_staff",
    description:
      "Get available staff members, optionally filtered by role. Returns name, role, hourly rate.",
    input_schema: {
      type: "object" as const,
      properties: {
        role: {
          type: "string",
          description:
            "Filter by role (e.g. chef, server, bartender, captain, prep cook)",
        },
      },
      required: [],
    },
  },
  {
    name: "lookup_clients",
    description:
      "Search the client database by name, email, or company. Returns client details and history.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term — matches against name, email, or company",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_past_events",
    description:
      "Find similar past events by type and/or guest count range. Returns event details and pricing for reference.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_type: {
          type: "string",
          description:
            "Type of event (e.g. wedding, corporate, birthday, gala)",
        },
        guest_count_range: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description: "Min and max guest count, e.g. [80, 120]",
        },
      },
      required: [],
    },
  },
  {
    name: "lookup_staff_availability",
    description:
      "Check which staff members are already assigned to events on a specific date. Returns staff names and the events they're booked for. Use this to avoid double-booking.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date to check in YYYY-MM-DD format",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "get_business_defaults",
    description:
      "Get business default rates for admin fees, tax, margins, and other settings.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_labor_report",
    description:
      "Get the labor cost report for a specific event. Returns staff breakdown, labor cost, labor as percentage of revenue, and margin impact. Use this when analyzing event profitability or when the user asks about labor costs.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to get the labor report for",
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "get_qb_sync_status",
    description:
      "Check the QuickBooks sync status for the current user. Returns connection state, company name, and recent sync activity. Use this when the user asks about their QuickBooks integration or accounting sync.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_payroll_status",
    description:
      "Check the payroll integration status. Returns connection state, mapped employees, and recent exports. Use this when the user asks about payroll or staff payment status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "compare_distributor_prices",
    description:
      "Compare prices for an ingredient across all connected distributors. Returns each distributor's SKU, price, pack size, and whether it's the preferred vendor. Use when the user asks about pricing, wants to find the cheapest option, or when building purchase orders.",
    input_schema: {
      type: "object" as const,
      properties: {
        inventory_item_id: {
          type: "string",
          description: "The inventory item ID to compare prices for",
        },
        ingredient_name: {
          type: "string",
          description: "Ingredient name to search for (alternative to inventory_item_id)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_distributor_spending",
    description:
      "Get spending summary across distributors for a date range. Returns invoice counts, total spend, credits, and net spend per distributor. Use when analyzing vendor costs, budgeting, or comparing distributor value.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_distributor_sync_status",
    description:
      "Check the sync status and recent activity for distributor integrations. Returns connected distributors, recent sync jobs, and any failures. Use when the user asks about their distributor connections or import history.",
    input_schema: {
      type: "object" as const,
      properties: {
        distributor_id: {
          type: "string",
          description: "Optional — filter to a specific distributor",
        },
      },
      required: [],
    },
  },
  {
    name: "recommend_staffing",
    description:
      "Get AI-recommended staffing levels based on event parameters. Returns roles, headcount, hours, and rates using industry standards and actual staff database rates.",
    input_schema: {
      type: "object" as const,
      properties: {
        guest_count: { type: "number", description: "Number of guests" },
        service_style: {
          type: "string",
          description: "Service style (plated, buffet, cocktail, stations, family style)",
        },
        event_type: { type: "string", description: "Type of event" },
        event_duration_hours: {
          type: "number",
          description: "Duration of service in hours (default 5)",
        },
        menu_item_count: { type: "number", description: "Number of menu items" },
        has_bar: { type: "boolean", description: "Whether event includes bar service" },
      },
      required: ["guest_count"],
    },
  },
  {
    name: "recommend_rentals",
    description:
      "Get AI-recommended rental items based on event parameters. Returns items, quantities, and costs. Matches against your rental item library for accurate pricing.",
    input_schema: {
      type: "object" as const,
      properties: {
        guest_count: { type: "number", description: "Number of guests" },
        service_style: {
          type: "string",
          description: "Service style (plated, buffet, cocktail, stations)",
        },
        event_type: { type: "string", description: "Type of event" },
        venue_provides: {
          type: "array",
          items: { type: "string" },
          description: "Items the venue already provides (e.g. tables, chairs, linens)",
        },
        menu_item_count: { type: "number", description: "Number of menu items" },
      },
      required: ["guest_count"],
    },
  },
  {
    name: "lookup_rental_items",
    description:
      "Search the rental item library by name or category. Returns available rental items with pricing.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term for rental item name",
        },
        category: {
          type: "string",
          description: "Filter by category (Tables, Chairs, Linens, Glassware, Flatware, Serving, Cooking, Tents, Lighting, Decor, Other)",
        },
      },
      required: [],
    },
  },
  {
    name: "preview_prep_breakdown",
    description:
      "Preview the kitchen prep breakdown for the planned event. Shows tasks organized by station and by dish with scaled quantities. Call after recipes are matched and before finalize_plan.",
    input_schema: {
      type: "object" as const,
      properties: {
        menu_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Menu item name (must match a recipe name)",
              },
              recipe_id: {
                type: "string",
                description: "Recipe ID if known",
              },
              quantity: {
                type: "number",
                description: "Number of servings (defaults to guest_count)",
              },
            },
            required: ["name"],
          },
          description: "Menu items to generate prep breakdown for",
        },
        guest_count: {
          type: "number",
          description: "Number of guests",
        },
      },
      required: ["menu_items", "guest_count"],
    },
  },
  {
    name: "generate_shopping_list",
    description:
      "Generate a categorized shopping list from the planned menu items and matched recipes. Call this after recipes are matched/generated and before finalize_plan. Returns aggregated, scaled ingredients grouped by category with inventory comparison.",
    input_schema: {
      type: "object" as const,
      properties: {
        menu_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Menu item name (must match a recipe name)",
              },
              recipe_id: {
                type: "string",
                description: "Recipe ID if known",
              },
              quantity: {
                type: "number",
                description: "Number of servings needed (defaults to guest_count)",
              },
            },
            required: ["name"],
          },
          description: "Menu items to generate shopping list for",
        },
        guest_count: {
          type: "number",
          description: "Number of guests",
        },
      },
      required: ["menu_items", "guest_count"],
    },
  },
  {
    name: "generate_draft_recipes",
    description:
      "Generate AI draft recipes for menu items that don't match existing recipes. Call this after lookup_recipes returns no matches for some items. Returns draft recipes with full ingredient lists and costing.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Menu item name" },
              category: {
                type: "string",
                description: "Category (Appetizers, Mains, Sides, Desserts, Drinks, Other)",
              },
            },
            required: ["name"],
          },
          description: "Menu items that need recipes generated",
        },
        guest_count: {
          type: "number",
          description: "Number of guests for context",
        },
        service_style: {
          type: "string",
          description: "Service style (plated, buffet, cocktail, stations)",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "update_extracted_entities",
    description:
      "Report what you have understood so far from the conversation. Call this after processing each user message to update the extraction panel with event details, client info, menu items, staffing, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        event: {
          type: "object",
          description:
            "Event details like name, event_type, event_date, guest_count, venue, start_time, end_time. Each field: { value, confidence }",
          additionalProperties: {
            type: "object",
            properties: {
              value: { type: ["string", "number", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        client: {
          type: "object",
          description:
            "Client details like client_name, client_email, client_phone, client_id. Each field: { value, confidence }",
          additionalProperties: {
            type: "object",
            properties: {
              value: { type: ["string", "number", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        menu: {
          type: "array",
          description: "Menu items. Each: { key, value, confidence }",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: ["string", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        staffing: {
          type: "array",
          description: "Staffing needs. Each: { key, value, confidence }",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: ["string", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        rentals: {
          type: "array",
          description: "Rental items. Each: { key, value, confidence }",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: ["string", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        timeline: {
          type: "array",
          description: "Timeline entries. Each: { key, value, confidence }",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: ["string", "null"] },
              confidence: {
                type: "string",
                enum: ["confirmed", "inferred", "assumed"],
              },
            },
            required: ["value"],
          },
        },
        budget: {
          type: "object",
          description: "Budget info: { value, confidence }",
          properties: {
            value: { type: ["string", "number", "null"] },
            confidence: {
              type: "string",
              enum: ["confirmed", "inferred", "assumed"],
            },
          },
          required: ["value"],
        },
        serviceStyle: {
          type: "object",
          description:
            "Service style (plated, buffet, cocktail, etc.): { value, confidence }",
          properties: {
            value: { type: ["string", "null"] },
            confidence: {
              type: "string",
              enum: ["confirmed", "inferred", "assumed"],
            },
          },
          required: ["value"],
        },
      },
      required: [],
    },
  },
  {
    name: "generate_timeline",
    description:
      "Generate a structured day-of event timeline with kitchen prep, setup, service, and breakdown phases. Call when you have start time, service style, and guest count.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_time: { type: "string", description: "Event start time in HH:MM format (e.g. '18:00')" },
        end_time: { type: "string", description: "Event end time in HH:MM format (e.g. '22:00')" },
        service_style: { type: "string", description: "Service style (plated, buffet, cocktail, stations)" },
        event_type: { type: "string", description: "Type of event (wedding, corporate, etc.)" },
        guest_count: { type: "number", description: "Number of guests" },
        menu_item_count: { type: "number", description: "Number of menu items/courses" },
        has_bar: { type: "boolean", description: "Whether event includes bar service" },
        has_ceremony: { type: "boolean", description: "Whether event includes a ceremony (e.g. wedding)" },
      },
      required: ["guest_count"],
    },
  },
  {
    name: "find_similar_patterns",
    description:
      "Find past events similar to the current plan and extract reusable patterns (menus, staffing, pricing). Use early in planning to inform recommendations based on what has worked before.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_type: { type: "string", description: "Type of event" },
        guest_count: { type: "number", description: "Approximate guest count" },
        service_style: { type: "string", description: "Service style" },
        menu_item_count: { type: "number", description: "Number of planned menu items" },
      },
      required: ["guest_count"],
    },
  },
  {
    name: "save_as_template",
    description:
      "Save the current event plan as a reusable template for future events. Call when the user asks to save the plan as a template, or suggest it after finalizing a successful event.",
    input_schema: {
      type: "object" as const,
      properties: {
        template_name: { type: "string", description: "Name for the template" },
        template_description: { type: "string", description: "Brief description" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization (e.g. 'wedding', 'buffet', '100-guests')",
        },
      },
      required: ["template_name"],
    },
  },
  {
    name: "analyze_event_margin",
    description:
      "Analyze the planned event's profitability and cost structure. Returns margin breakdown, cost flags, and comparison to past events. Call after building pricing but before finalize_plan.",
    input_schema: {
      type: "object" as const,
      properties: {
        guest_count: { type: "number", description: "Number of guests" },
        food_cost_total: { type: "number", description: "Total food cost" },
        staffing_total: { type: "number", description: "Total staffing cost" },
        rentals_total: { type: "number", description: "Total rentals cost" },
        bar_total: { type: "number", description: "Total bar cost" },
        subtotal: { type: "number", description: "Subtotal before admin/tax" },
        admin_fee: { type: "number", description: "Admin fee amount" },
        tax_amount: { type: "number", description: "Tax amount" },
        total_cost: { type: "number", description: "Total cost" },
        suggested_price: { type: "number", description: "Suggested price" },
        projected_margin: { type: "number", description: "Projected margin %" },
        target_margin_percent: { type: "number", description: "Target margin %" },
        event_type: { type: "string", description: "Type of event for past comparison" },
      },
      required: ["guest_count", "total_cost", "suggested_price", "projected_margin"],
    },
  },
  {
    name: "check_inventory_conflicts",
    description:
      "Check if upcoming events on nearby dates compete for the same inventory items. Call when planning events close to other scheduled events.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_date: {
          type: "string",
          description: "The planned event date in YYYY-MM-DD format",
        },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Ingredient name" },
              quantity: { type: "number", description: "Quantity needed" },
              unit: { type: "string", description: "Unit of measurement" },
            },
            required: ["name", "quantity", "unit"],
          },
          description: "Ingredients to check for conflicts",
        },
      },
      required: ["event_date", "ingredients"],
    },
  },
  {
    name: "generate_purchase_draft",
    description:
      "Map the shopping list to distributor products and generate draft purchase order lines. Call after generating the shopping list to show procurement-ready data grouped by distributor. Returns mapped and unmapped items.",
    input_schema: {
      type: "object" as const,
      properties: {
        shopping_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ingredient_name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            },
            required: ["ingredient_name", "quantity", "unit"],
          },
          description: "Shopping list items to map to distributor products",
        },
      },
      required: ["shopping_items"],
    },
  },
  {
    name: "lookup_venue",
    description:
      "Look up venue details including capacity, amenities, and access notes. Use when the user mentions a venue or to check if a venue can accommodate the event.",
    input_schema: {
      type: "object" as const,
      properties: {
        venue_name: {
          type: "string",
          description: "Venue name to search for",
        },
      },
      required: ["venue_name"],
    },
  },
  {
    name: "produce_prep_sheet",
    description:
      "Generate a production-ready prep sheet for the planned event. Creates prep items organized by station and dish, a shopping list, and a pack list. Call after recipes are matched and menu is finalized. This persists the production data so it's ready when the event is committed.",
    input_schema: {
      type: "object" as const,
      properties: {
        menu_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Menu item name" },
              recipe_id: { type: "string", description: "Recipe ID if known" },
              quantity: { type: "number", description: "Number of servings" },
              category: { type: "string", description: "Category (appetizer, main, side, dessert)" },
            },
            required: ["name"],
          },
          description: "Menu items to generate production sheets for",
        },
        guest_count: {
          type: "number",
          description: "Number of guests",
        },
        event_date: {
          type: "string",
          description: "Event date (YYYY-MM-DD) for scheduling prep timeline",
        },
        service_style: {
          type: "string",
          description: "Service style (plated, buffet, cocktail, stations)",
        },
      },
      required: ["menu_items", "guest_count"],
    },
  },
  {
    name: "finalize_plan",
    description:
      "Submit the complete structured event plan. This MUST be the last tool call. The plan includes event details, pricing breakdown, timeline, recipe matches, inventory warnings, assumptions, and questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        plan: {
          type: "object",
          description: "The complete CainEventPlan object",
        },
      },
      required: ["plan"],
    },
  },
  // Write/action tools that propose changes
  ...writeToolDefinitions,
] as const;

// ---------- Tool execution ----------

type ToolContext = {
  userId: string;
  orgId: string | null;
};

// --- Individual handlers ---

async function lookupRecipes(
  ctx: ToolContext,
  input: { query?: string; category?: string }
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("recipes")
    .select("id, name, description, category, servings, cost_per_serving, total_cost, ingredients, source, status")
    .eq("user_id", ctx.userId)
    .neq("status", "archived");

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
  if (input.category) q = q.ilike("category", `%${input.category}%`);
  if (input.query) q = q.ilike("name", `%${input.query}%`);

  q = q.limit(20);

  const { data, error } = await q;
  if (error) return `Error searching recipes: ${error.message}`;
  if (!data || data.length === 0) return "No recipes found matching the criteria.";

  return JSON.stringify(
    data.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      servings: r.servings,
      costPerServing: r.cost_per_serving,
      totalCost: r.total_cost,
      ingredientCount: Array.isArray(r.ingredients) ? r.ingredients.length : 0,
      source: r.source ?? "manual",
      status: r.status ?? "approved",
    })),
    null,
    2
  );
}

async function lookupInventory(
  ctx: ToolContext,
  input: { ingredients?: string[] }
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("inventory")
    .select("id, ingredient_name, quantity_on_hand, unit, par_level, cost_per_unit, category")
    .eq("user_id", ctx.userId);

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);

  if (input.ingredients && input.ingredients.length > 0) {
    // Use ilike with OR for each ingredient
    const filters = input.ingredients
      .map((i) => `ingredient_name.ilike.%${i}%`)
      .join(",");
    q = q.or(filters);
  }

  q = q.limit(50);

  const { data, error } = await q;
  if (error) return `Error checking inventory: ${error.message}`;
  if (!data || data.length === 0) return "No inventory items found.";

  return JSON.stringify(
    data.map((item) => ({
      name: item.ingredient_name,
      onHand: item.quantity_on_hand,
      unit: item.unit,
      parLevel: item.par_level,
      costPerUnit: item.cost_per_unit,
      category: item.category,
    })),
    null,
    2
  );
}

async function lookupStaff(
  ctx: ToolContext,
  input: { role?: string }
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("staff_members")
    .select("id, name, role, pay_type, hourly_rate, phone, email")
    .eq("user_id", ctx.userId);

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
  if (input.role) q = q.ilike("role", `%${input.role}%`);

  q = q.limit(30);

  const { data, error } = await q;
  if (error) return `Error looking up staff: ${error.message}`;
  if (!data || data.length === 0) return "No staff members found.";

  return JSON.stringify(
    data.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      payType: s.pay_type,
      hourlyRate: s.hourly_rate,
      phone: s.phone,
      email: s.email,
    })),
    null,
    2
  );
}

async function lookupStaffAvailability(
  ctx: ToolContext,
  input: { date: string }
): Promise<string> {
  const supabase = await createClient();

  // Find all assignments on this date by joining through events
  let q = supabase
    .from("event_staff_assignments")
    .select("staff_member_id, role, start_time, end_time, confirmed, staff_members(id, name, role), events!inner(id, name, event_date)")
    .eq("events.event_date", input.date);

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);

  const { data, error } = await q;
  if (error) return `Error checking staff availability: ${error.message}`;
  if (!data || data.length === 0) return `No staff are booked on ${input.date}. All staff are available.`;

  // Group by staff member
  const byStaff: Record<string, { name: string; role: string; events: Array<{ eventName: string; shiftTime: string; confirmed: boolean }> }> = {};
  for (const row of data) {
    const staff = row.staff_members as any;
    const event = row.events as any;
    if (!staff?.id) continue;

    if (!byStaff[staff.id]) {
      byStaff[staff.id] = { name: staff.name, role: staff.role, events: [] };
    }
    byStaff[staff.id].events.push({
      eventName: event?.name || "Unknown event",
      shiftTime: row.start_time && row.end_time ? `${row.start_time}-${row.end_time}` : "Full day",
      confirmed: row.confirmed ?? false,
    });
  }

  return JSON.stringify(
    Object.values(byStaff).map((s) => ({
      name: s.name,
      role: s.role,
      bookedEvents: s.events,
    })),
    null,
    2
  );
}

async function lookupClients(
  ctx: ToolContext,
  input: { query: string }
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, email, phone, dietary_notes, tags, status")
    .eq("user_id", ctx.userId);

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);

  // Search across name, email, and company
  q = q.or(
    `first_name.ilike.%${input.query}%,last_name.ilike.%${input.query}%,email.ilike.%${input.query}%,company_name.ilike.%${input.query}%`
  );

  q = q.limit(10);

  const { data, error } = await q;
  if (error) return `Error searching clients: ${error.message}`;
  if (!data || data.length === 0) return "No clients found matching that query.";

  return JSON.stringify(
    data.map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      company: c.company_name,
      email: c.email,
      phone: c.phone,
      dietaryNotes: c.dietary_notes,
      tags: c.tags,
      status: c.status,
    })),
    null,
    2
  );
}

async function lookupPastEvents(
  ctx: ToolContext,
  input: { event_type?: string; guest_count_range?: [number, number] }
): Promise<string> {
  const supabase = await createClient();
  let q = supabase
    .from("events")
    .select("id, name, client_name, event_date, guest_count, venue, status, pricing_data, notes")
    .eq("user_id", ctx.userId)
    .in("status", ["confirmed", "completed"]);

  if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);

  if (input.guest_count_range) {
    q = q
      .gte("guest_count", input.guest_count_range[0])
      .lte("guest_count", input.guest_count_range[1]);
  }

  q = q.order("event_date", { ascending: false }).limit(10);

  const { data, error } = await q;
  if (error) return `Error searching past events: ${error.message}`;
  if (!data || data.length === 0) return "No similar past events found.";

  return JSON.stringify(
    data.map((e) => ({
      id: e.id,
      name: e.name,
      clientName: e.client_name,
      date: e.event_date,
      guestCount: e.guest_count,
      venue: e.venue,
      status: e.status,
      totalCost: e.pricing_data?.totalCost ?? null,
      suggestedPrice: e.pricing_data?.suggestedPrice ?? null,
      menuItemCount: e.pricing_data?.menuItems?.length ?? 0,
    })),
    null,
    2
  );
}

async function getBusinessDefaults(ctx: ToolContext): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const defaults = {
    adminFeePercent:
      data?.default_admin_fee ?? DEFAULTS.ADMIN_FEE_PERCENT,
    taxRatePercent:
      data?.default_tax_rate ?? DEFAULTS.TAX_RATE_PERCENT,
    targetMarginPercent:
      data?.default_target_margin ?? DEFAULTS.PROFIT_MARGIN_PERCENT,
    depositPercent: data?.default_deposit_percent ?? 50,
    businessName: data?.business_name ?? null,
    paymentTerms: data?.payment_terms ?? null,
    cancellationPolicy: data?.cancellation_policy ?? null,
    serviceChargePercent: data?.service_charge_percent ?? null,
  };

  return JSON.stringify(defaults, null, 2);
}

async function getLaborReport(
  ctx: ToolContext,
  input: { event_id: string }
): Promise<string> {
  const report = await getEventLaborReport({
    userId: ctx.userId,
    orgId: ctx.orgId,
    eventId: input.event_id,
  });

  if ("error" in report) return `Error: ${report.error}`;
  return JSON.stringify(report, null, 2);
}

async function getQBSyncStatus(ctx: ToolContext): Promise<string> {
  const conn = await getQBConnection(ctx.userId, ctx.orgId);
  if (!conn) {
    return JSON.stringify({ connected: false, message: "QuickBooks is not connected." });
  }

  const logs = await getRecentSyncLogs({ userId: ctx.userId, orgId: ctx.orgId, limit: 10 });
  return JSON.stringify(
    {
      connected: true,
      companyName: conn.company_name,
      lastSynced: conn.last_synced_at,
      recentActivity: logs.map((l) => ({
        entityType: l.entityType,
        direction: l.direction,
        status: l.status,
        error: l.errorMessage,
        date: l.createdAt,
      })),
    },
    null,
    2
  );
}

async function getPayrollStatus(ctx: ToolContext): Promise<string> {
  const conn = await getPayrollConnection(ctx.userId, ctx.orgId);
  if (!conn) {
    return JSON.stringify({ connected: false, message: "Payroll (Gusto) is not connected." });
  }

  const mappings = await getPayrollMappings(ctx.userId, ctx.orgId);
  return JSON.stringify(
    {
      connected: true,
      provider: conn.provider,
      companyName: conn.company_name,
      mappedEmployees: mappings.length,
      employees: mappings.map((m) => ({
        staffMemberId: m.staff_member_id,
        name: m.employee_name,
        type: m.employee_type,
        active: m.is_active,
      })),
    },
    null,
    2
  );
}

async function compareDistributorPrices(
  ctx: ToolContext,
  input: { inventory_item_id?: string; ingredient_name?: string }
): Promise<string> {
  const supabase = await createClient();

  let inventoryItemId = input.inventory_item_id;

  // If searching by name, find the inventory item first
  if (!inventoryItemId && input.ingredient_name) {
    let q = supabase
      .from("inventory")
      .select("id, ingredient_name")
      .eq("user_id", ctx.userId)
      .ilike("ingredient_name", `%${input.ingredient_name}%`)
      .limit(1);
    if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);

    const { data } = await q;
    if (data && data.length > 0) {
      inventoryItemId = data[0].id;
    } else {
      return `No inventory item found matching "${input.ingredient_name}".`;
    }
  }

  if (!inventoryItemId) {
    return "Please provide either inventory_item_id or ingredient_name.";
  }

  const options = await getProductOptions({
    orgId: ctx.orgId,
    inventoryItemId,
  });

  if (options.length === 0) {
    return "No distributor products are mapped to this ingredient. Map products first in the distributor settings.";
  }

  return JSON.stringify(
    options.map((o) => ({
      distributor: o.distributorName,
      sku: o.product.sku,
      productName: o.product.name,
      brand: o.product.brand,
      packSize: o.product.pack_size,
      unitPrice: o.product.unit_price,
      unit: o.product.unit,
      conversionFactor: o.conversion_factor,
      conversionUnit: o.conversion_unit,
      isPreferred: o.is_preferred,
      pricePerUnit: o.product.unit_price && o.conversion_factor
        ? Math.round((o.product.unit_price / o.conversion_factor) * 100) / 100
        : null,
    })),
    null,
    2
  );
}

async function getDistributorSpending(
  ctx: ToolContext,
  input: { start_date: string; end_date: string }
): Promise<string> {
  const summary = await getSpendingSummary({
    userId: ctx.userId,
    orgId: ctx.orgId,
    startDate: input.start_date,
    endDate: input.end_date,
  });

  if (summary.length === 0) {
    return `No distributor invoices found between ${input.start_date} and ${input.end_date}.`;
  }

  const totalSpend = summary.reduce((s, d) => s + d.netSpend, 0);

  return JSON.stringify(
    {
      period: { start: input.start_date, end: input.end_date },
      totalNetSpend: Math.round(totalSpend * 100) / 100,
      distributors: summary,
    },
    null,
    2
  );
}

async function getDistributorSyncStatus(
  ctx: ToolContext,
  input: { distributor_id?: string }
): Promise<string> {
  const supabase = await createClient();

  // Get connected distributors
  let dq = supabase
    .from("distributors")
    .select("id, name, connector_type, transport, is_active, last_synced_at")
    .eq("user_id", ctx.userId)
    .eq("is_active", true);
  if (ctx.orgId) dq = dq.eq("organization_id", ctx.orgId);

  const { data: distributors } = await dq;

  // Get recent sync jobs
  const jobs = await getRecentSyncJobs({
    userId: ctx.userId,
    orgId: ctx.orgId,
    distributorId: input.distributor_id,
    limit: 15,
  });

  return JSON.stringify(
    {
      connectedDistributors: (distributors ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        connectorType: d.connector_type,
        transport: d.transport,
        lastSynced: d.last_synced_at,
      })),
      recentSyncJobs: jobs.map((j) => ({
        id: j.id,
        distributorId: j.distributor_id,
        jobType: j.job_type,
        status: j.status,
        error: j.error_message,
        attempts: j.attempts,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      })),
    },
    null,
    2
  );
}

function finalizePlan(
  _ctx: ToolContext,
  input: { plan: CainEventPlan }
): string {
  // Validation — the plan is extracted by the engine, this just acknowledges it
  if (!input.plan?.event?.name) {
    return "Error: Plan is missing required event name.";
  }
  if (!input.plan?.pricing) {
    return "Error: Plan is missing pricing data.";
  }
  return "Plan finalized successfully.";
}

// ---------- Dispatcher ----------

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ result: string; plan?: CainEventPlan; entityUpdate?: Partial<ExtractedEntities>; draftRecipes?: CainDraftRecipe[]; shoppingList?: CainShoppingList; prepPreview?: CainPrepPreview; marginAnalysis?: CainMarginAnalysis; procurementDraft?: CainProcurementDraft }> {
  switch (toolName) {
    case "lookup_recipes":
      return {
        result: await lookupRecipes(ctx, input as { query?: string; category?: string }),
      };
    case "lookup_inventory":
      return {
        result: await lookupInventory(ctx, input as { ingredients?: string[] }),
      };
    case "lookup_staff":
      return { result: await lookupStaff(ctx, input as { role?: string }) };
    case "lookup_staff_availability":
      return { result: await lookupStaffAvailability(ctx, input as { date: string }) };
    case "lookup_clients":
      return {
        result: await lookupClients(ctx, input as { query: string }),
      };
    case "lookup_past_events":
      return {
        result: await lookupPastEvents(
          ctx,
          input as { event_type?: string; guest_count_range?: [number, number] }
        ),
      };
    case "get_business_defaults":
      return { result: await getBusinessDefaults(ctx) };
    case "get_labor_report":
      return { result: await getLaborReport(ctx, input as { event_id: string }) };
    case "get_qb_sync_status":
      return { result: await getQBSyncStatus(ctx) };
    case "get_payroll_status":
      return { result: await getPayrollStatus(ctx) };
    case "compare_distributor_prices":
      return { result: await compareDistributorPrices(ctx, input as { inventory_item_id?: string; ingredient_name?: string }) };
    case "get_distributor_spending":
      return { result: await getDistributorSpending(ctx, input as { start_date: string; end_date: string }) };
    case "get_distributor_sync_status":
      return { result: await getDistributorSyncStatus(ctx, input as { distributor_id?: string }) };
    case "recommend_staffing": {
      const guestCount = (input.guest_count as number) || 100;
      const supabase = await createClient();

      // Fetch available staff with rates
      let staffQuery = supabase
        .from("staff_members")
        .select("id, name, role, hourly_rate")
        .eq("user_id", ctx.userId);
      if (ctx.orgId) staffQuery = staffQuery.eq("organization_id", ctx.orgId);
      const { data: staffData } = await staffQuery;

      const availableStaff = (staffData || []).map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        hourlyRate: s.hourly_rate,
      }));

      const recs = recommendStaffing({
        guestCount,
        serviceStyle: input.service_style as string | undefined,
        eventType: input.event_type as string | undefined,
        eventDurationHours: input.event_duration_hours as number | undefined,
        menuItemCount: input.menu_item_count as number | undefined,
        hasBar: input.has_bar as boolean | undefined,
        availableStaff,
      });

      const totalStaff = recs.reduce((s, r) => s + r.headcount, 0);
      const totalCost = recs.reduce((s, r) => s + r.hourlyRate * r.hours * r.headcount, 0);

      return {
        result: JSON.stringify({
          recommendations: recs,
          totalStaff,
          estimatedLaborCost: Math.round(totalCost * 100) / 100,
          staffInDatabase: availableStaff.length,
        }, null, 2),
      };
    }
    case "recommend_rentals": {
      const guestCount = (input.guest_count as number) || 100;
      const supabase = await createClient();

      // Fetch rental library
      let rentalQuery = supabase
        .from("rental_items")
        .select("id, name, category, unit_cost")
        .eq("user_id", ctx.userId);
      if (ctx.orgId) rentalQuery = rentalQuery.eq("organization_id", ctx.orgId);
      const { data: rentalData } = await rentalQuery;

      const availableRentals = (rentalData || []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category || "Other",
        unitCost: r.unit_cost,
      }));

      const recs = recommendRentals({
        guestCount,
        serviceStyle: input.service_style as string | undefined,
        eventType: input.event_type as string | undefined,
        venueProvides: input.venue_provides as string[] | undefined,
        menuItemCount: input.menu_item_count as number | undefined,
        availableRentals,
      });

      const totalCost = recs.reduce((s, r) => s + r.unitCost * r.quantity, 0);

      return {
        result: JSON.stringify({
          recommendations: recs,
          totalItems: recs.length,
          estimatedRentalCost: Math.round(totalCost * 100) / 100,
          rentalsInLibrary: availableRentals.length,
        }, null, 2),
      };
    }
    case "lookup_rental_items": {
      const supabase = await createClient();
      let q = supabase
        .from("rental_items")
        .select("id, name, category, unit_cost, vendor, notes")
        .eq("user_id", ctx.userId);

      if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
      if (input.query) q = q.ilike("name", `%${input.query}%`);
      if (input.category) q = q.ilike("category", `%${input.category}%`);

      q = q.limit(30);

      const { data, error } = await q;
      if (error) return { result: `Error searching rental items: ${error.message}` };
      if (!data || data.length === 0) return { result: "No rental items found." };

      return {
        result: JSON.stringify(
          data.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            unitCost: r.unit_cost,
            vendor: r.vendor,
          })),
          null,
          2
        ),
      };
    }
    case "preview_prep_breakdown": {
      const menuItems = (input.menu_items as Array<{ name: string; recipe_id?: string; quantity?: number }>) || [];
      const guestCount = (input.guest_count as number) || 100;
      const supabase = await createClient();

      // Fetch recipes by ID or name
      const recipeMap = new Map<string, { name: string; servings: number; category?: string; station?: string | null; ingredients: Array<{ name: string; quantity: number; unit: string }> }>();

      const recipeIds = menuItems.map((m) => m.recipe_id).filter(Boolean) as string[];
      const recipeNames = menuItems.map((m) => m.name.toLowerCase());

      if (recipeIds.length > 0) {
        const { data } = await supabase
          .from("recipes")
          .select("id, name, servings, category, ingredients")
          .in("id", recipeIds)
          .eq("user_id", ctx.userId);
        for (const r of data || []) {
          recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, category: r.category, ingredients: r.ingredients as any[] });
        }
      }

      const unmatchedNames = recipeNames.filter((n) => !recipeMap.has(n));
      if (unmatchedNames.length > 0) {
        let q = supabase
          .from("recipes")
          .select("id, name, servings, category, ingredients")
          .eq("user_id", ctx.userId)
          .neq("status", "archived");
        if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
        const { data } = await q;
        for (const r of data || []) {
          if (unmatchedNames.includes(r.name.toLowerCase())) {
            recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, category: r.category, ingredients: r.ingredients as any[] });
          }
        }
      }

      const preview = buildPrepPreview(menuItems, recipeMap, guestCount);

      const stationSummary = Object.entries(preview.stationCounts)
        .map(([s, c]) => `${s.replace(/_/g, " ")}: ${c}`)
        .join(", ");

      return {
        result: `Prep breakdown: ${preview.totalTasks} tasks across ${Object.keys(preview.stationCounts).length} stations (${stationSummary})`,
        prepPreview: preview,
      };
    }
    case "generate_shopping_list": {
      const menuItems = (input.menu_items as Array<{ name: string; recipe_id?: string; quantity?: number }>) || [];
      const guestCount = (input.guest_count as number) || 100;
      console.log(`[CAIN Tool] generate_shopping_list: ${menuItems.length} items, ${guestCount} guests, recipe_ids: ${menuItems.map(m => m.recipe_id || "none").join(", ")}`);
      const supabase = await createClient();

      // Fetch recipes by ID or name
      const recipeMap = new Map<string, { name: string; servings: number; ingredients: Array<{ name: string; quantity: number; unit: string; cost_per_unit: number }> }>();

      const recipeIds = menuItems.map((m) => m.recipe_id).filter(Boolean) as string[];
      const recipeNames = menuItems.map((m) => m.name.toLowerCase());

      if (recipeIds.length > 0) {
        const { data } = await supabase
          .from("recipes")
          .select("id, name, servings, ingredients")
          .in("id", recipeIds)
          .eq("user_id", ctx.userId);
        for (const r of data || []) {
          recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, ingredients: r.ingredients as any[] });
        }
      }

      // Fallback: fetch by name for items without recipe_id
      const unmatchedNames = recipeNames.filter((n) => !recipeMap.has(n));
      if (unmatchedNames.length > 0) {
        let q = supabase
          .from("recipes")
          .select("id, name, servings, ingredients")
          .eq("user_id", ctx.userId)
          .neq("status", "archived");
        if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
        const { data } = await q;
        for (const r of data || []) {
          if (unmatchedNames.includes(r.name.toLowerCase())) {
            recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, ingredients: r.ingredients as any[] });
          }
        }
      }

      console.log(`[CAIN Tool] generate_shopping_list: found ${recipeMap.size} recipes in DB for ${menuItems.length} menu items. Matched: [${Array.from(recipeMap.keys()).join(", ")}]`);

      // Aggregate ingredients
      let items = aggregateIngredients(menuItems, recipeMap, guestCount);

      // Compare with inventory
      let invQuery = supabase
        .from("inventory")
        .select("ingredient_name, quantity_on_hand, unit")
        .eq("user_id", ctx.userId);
      if (ctx.orgId) invQuery = invQuery.eq("organization_id", ctx.orgId);
      const { data: inventory } = await invQuery;
      if (inventory && inventory.length > 0) {
        items = compareWithInventory(items, inventory);
      }

      const rawList = buildShoppingList(items);
      const list = computeNetPurchaseList(rawList);

      const needOrder = list.items.filter((i) => i.inventoryStatus === "need_to_order" || i.inventoryStatus === "partial").length;
      const creditNote = list.inventoryCredit && list.inventoryCredit > 0
        ? ` Inventory covers $${list.inventoryCredit.toFixed(2)} worth of ingredients.`
        : "";
      const purchaseNote = list.purchaseCost !== undefined
        ? ` Purchase cost: $${list.purchaseCost.toFixed(2)}.`
        : "";
      const summary = `Shopping list: ${list.totalItems} ingredients across ${Object.keys(list.categoryCounts).length} categories. Est. total: $${list.totalEstimatedCost.toFixed(2)}.${purchaseNote}${creditNote} ${needOrder} items need ordering.`;

      return {
        result: summary,
        shoppingList: list,
      };
    }
    case "generate_draft_recipes": {
      const items = (input.items as Array<{ name: string; category?: string }>) || [];
      const guestCount = (input.guest_count as number) || 100;
      const serviceStyle = input.service_style as string | undefined;
      console.log(`[CAIN Tool] generate_draft_recipes: ${items.length} items, ${guestCount} guests`);

      const drafts = await generateDraftRecipes({
        menuItems: items,
        guestCount,
        serviceStyle,
      });

      // Save drafts to DB with status 'draft'
      if (drafts.length > 0) {
        const supabase = await createClient();
        for (const draft of drafts) {
          const { data } = await supabase
            .from("recipes")
            .insert({
              user_id: ctx.userId,
              organization_id: ctx.orgId,
              name: draft.recipe.name,
              description: draft.recipe.description,
              category: draft.recipe.category,
              servings: draft.recipe.servings,
              ingredients: draft.recipe.ingredients,
              total_cost: draft.recipe.total_cost,
              cost_per_serving: draft.recipe.cost_per_serving,
              source: "ai_draft",
              status: "draft",
            })
            .select("id")
            .single();

          if (data) {
            draft.id = data.id;
          }
        }
      }

      const summary = drafts
        .map((d) => `${d.recipe.name}: $${d.recipe.cost_per_serving}/serving (${d.recipe.ingredients.length} ingredients)`)
        .join("; ");

      return {
        result: drafts.length > 0
          ? `Generated ${drafts.length} draft recipe(s): ${summary}`
          : "No draft recipes could be generated.",
        draftRecipes: drafts,
      };
    }
    case "generate_timeline": {
      const timeline = generateTimeline({
        startTime: input.start_time as string | undefined,
        endTime: input.end_time as string | undefined,
        serviceStyle: input.service_style as string | undefined,
        eventType: input.event_type as string | undefined,
        guestCount: (input.guest_count as number) || 100,
        menuItemCount: input.menu_item_count as number | undefined,
        hasBar: input.has_bar as boolean | undefined,
        hasCeremony: input.has_ceremony as boolean | undefined,
      });

      const phases = [...new Set(timeline.map((t) => t.phase))];
      const firstTime = timeline[0]?.start_time || "N/A";
      const lastItem = timeline[timeline.length - 1];
      const lastTime = lastItem?.start_time || "N/A";

      return {
        result: `Timeline generated: ${timeline.length} items across ${phases.length} phases (${phases.join(", ")}). Spans ${firstTime} to ${lastTime}.\n\n${JSON.stringify(timeline, null, 2)}`,
      };
    }
    case "find_similar_patterns": {
      const guestCount = (input.guest_count as number) || 100;
      const supabase = await createClient();

      // Fetch past events with pricing data
      let pastQuery = supabase
        .from("events")
        .select("id, name, event_date, guest_count, venue, status, notes, pricing_data")
        .eq("user_id", ctx.userId)
        .in("status", ["confirmed", "completed"])
        .not("pricing_data", "is", null)
        .order("event_date", { ascending: false })
        .limit(50);
      if (ctx.orgId) pastQuery = pastQuery.eq("organization_id", ctx.orgId);

      const { data: pastEvents } = await pastQuery;

      if (!pastEvents || pastEvents.length === 0) {
        return { result: "No past events found to compare against. This appears to be among your first events." };
      }

      const patterns = extractPatterns(pastEvents as any[], {
        eventType: input.event_type as string | undefined,
        serviceStyle: input.service_style as string | undefined,
        guestCount,
        menuItemCount: input.menu_item_count as number | undefined,
      });

      if (patterns.length === 0) {
        return { result: `Found ${pastEvents.length} past events, but none are sufficiently similar to the current plan.` };
      }

      const summaryLines = patterns.map((p, i) =>
        `${i + 1}. ${p.eventName} (${p.eventDate}) — ${p.guestCount} guests, ${p.similarityScore}% match${p.margin !== null ? `, ${p.margin.toFixed(1)}% margin` : ""}${p.pricePerGuest !== null ? `, $${p.pricePerGuest}/guest` : ""}`
      );

      return {
        result: JSON.stringify({
          matchCount: patterns.length,
          totalPastEvents: pastEvents.length,
          summary: summaryLines.join("\n"),
          patterns,
        }, null, 2),
      };
    }
    case "save_as_template": {
      const supabase = await createClient();
      const templateName = (input.template_name as string) || "Untitled Template";
      const description = (input.template_description as string) || null;
      const tags = (input.tags as string[]) || [];

      // We need the current plan data — this comes from the accumulated state in chat-engine
      // Since we don't have the plan in the tool context, we save a placeholder that the engine fills
      // For now, save what we can from the input
      const { error } = await supabase.from("event_templates").insert({
        user_id: ctx.userId,
        organization_id: ctx.orgId,
        name: templateName.trim(),
        description,
        category: "full_event",
        template_data: {
          savedFromCain: true,
          savedAt: new Date().toISOString(),
        },
        tags,
      });

      if (error) {
        return { result: `Error saving template: ${error.message}` };
      }

      return { result: `Template "${templateName}" saved successfully. It can be applied to future events from the Templates page.` };
    }
    case "analyze_event_margin": {
      const guestCount = (input.guest_count as number) || 100;
      const pricing = {
        guestCount,
        foodCostTotal: (input.food_cost_total as number) || 0,
        staffingTotal: (input.staffing_total as number) || 0,
        rentalsTotal: (input.rentals_total as number) || 0,
        barTotal: (input.bar_total as number) || 0,
        subtotal: (input.subtotal as number) || 0,
        adminFee: (input.admin_fee as number) || 0,
        taxAmount: (input.tax_amount as number) || 0,
        totalCost: (input.total_cost as number) || 0,
        suggestedPrice: (input.suggested_price as number) || 0,
        projectedMargin: (input.projected_margin as number) || 0,
        targetMarginPercent: (input.target_margin_percent as number) || DEFAULTS.PROFIT_MARGIN_PERCENT,
      };

      let analysis = analyzeMargin(pricing);

      // Fetch past events for comparison
      const supabase = await createClient();
      let pastQuery = supabase
        .from("events")
        .select("guest_count, pricing_data")
        .eq("user_id", ctx.userId)
        .in("status", ["confirmed", "completed"])
        .not("pricing_data", "is", null)
        .order("event_date", { ascending: false })
        .limit(20);
      if (ctx.orgId) pastQuery = pastQuery.eq("organization_id", ctx.orgId);

      const { data: pastEvents } = await pastQuery;
      if (pastEvents && pastEvents.length > 0) {
        const pastSummaries = pastEvents
          .filter((e) => e.pricing_data?.totalCost && e.pricing_data?.suggestedPrice)
          .map((e) => ({
            guestCount: e.guest_count || 0,
            totalCost: e.pricing_data.totalCost,
            suggestedPrice: e.pricing_data.suggestedPrice,
            foodCostTotal: e.pricing_data.foodCostTotal,
          }));
        const comparison = compareToPastEvents(pastSummaries);
        analysis = addComparisonFlags(analysis, comparison);
      }

      const flagSummary = analysis.costFlags.length > 0
        ? ` Flags: ${analysis.costFlags.map((f) => f.message).join(" | ")}`
        : " No cost concerns.";
      const compSummary = analysis.pastEventComparison
        ? ` Past avg margin: ${analysis.pastEventComparison.avgMargin}% (${analysis.pastEventComparison.eventCount} events).`
        : "";

      return {
        result: `Margin analysis: ${analysis.marginPercent}% margin, $${analysis.pricePerGuest}/guest.${flagSummary}${compSummary}`,
        marginAnalysis: analysis,
      };
    }
    case "check_inventory_conflicts": {
      const eventDate = input.event_date as string;
      const ingredients = (input.ingredients as Array<{ name: string; quantity: number; unit: string }>) || [];

      const supabase = await createClient();

      // Find upcoming events within ±7 days (excluding current date)
      const startDate = new Date(eventDate);
      const rangeStart = new Date(startDate);
      rangeStart.setDate(rangeStart.getDate() - 7);
      const rangeEnd = new Date(startDate);
      rangeEnd.setDate(rangeEnd.getDate() + 7);

      let evtQuery = supabase
        .from("events")
        .select("id, name, event_date, pricing_data")
        .eq("user_id", ctx.userId)
        .in("status", ["draft", "confirmed"])
        .neq("event_date", eventDate)
        .gte("event_date", rangeStart.toISOString().split("T")[0])
        .lte("event_date", rangeEnd.toISOString().split("T")[0]);
      if (ctx.orgId) evtQuery = evtQuery.eq("organization_id", ctx.orgId);

      const { data: nearbyEvents } = await evtQuery;

      if (!nearbyEvents || nearbyEvents.length === 0) {
        return { result: `No other events within 7 days of ${eventDate}. No inventory conflicts.` };
      }

      // Build demand from nearby events' shopping items (from pricing_data menu items)
      // We need to check event_shopping_items table if it exists, or derive from pricing data
      let shoppingQuery = supabase
        .from("event_shopping_items")
        .select("event_id, ingredient_name, quantity, unit, events!inner(name)")
        .in("event_id", nearbyEvents.map((e) => e.id));

      const { data: shoppingItems } = await shoppingQuery;

      const upcomingDemand = (shoppingItems || []).map((si) => ({
        eventName: (si.events as any)?.name || "Unknown event",
        eventDate: "",
        ingredientName: si.ingredient_name,
        quantity: si.quantity || 0,
        unit: si.unit || "",
      }));

      // Fetch inventory for this user
      let invQuery = supabase
        .from("inventory")
        .select("ingredient_name, quantity_on_hand, unit")
        .eq("user_id", ctx.userId);
      if (ctx.orgId) invQuery = invQuery.eq("organization_id", ctx.orgId);
      const { data: inventory } = await invQuery;

      // Build shopping items for this event
      const invMap = new Map<string, number>();
      for (const inv of inventory || []) {
        invMap.set(inv.ingredient_name.toLowerCase(), inv.quantity_on_hand);
      }

      const thisEventItems = ingredients.map((ing) => ({
        ingredientName: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        estimatedCost: 0,
        category: "Miscellaneous" as const,
        fromRecipes: [],
        inventoryOnHand: invMap.get(ing.name.toLowerCase()) ?? 0,
      }));

      const conflicts = detectInventoryConflicts(thisEventItems, upcomingDemand);

      if (conflicts.length === 0) {
        return { result: `${nearbyEvents.length} event(s) within 7 days, but no inventory conflicts detected.` };
      }

      return {
        result: JSON.stringify({
          nearbyEventCount: nearbyEvents.length,
          conflicts: conflicts.map((c) => ({
            ingredient: c.ingredientName,
            thisEventNeeds: `${c.thisEventNeeds} ${c.unit}`,
            otherEventsNeed: `${c.otherEventsNeed} ${c.unit}`,
            available: `${c.available} ${c.unit}`,
            shortfall: `${c.shortfall} ${c.unit}`,
            conflictingEvents: c.conflictingEvents,
          })),
          warning: `${conflicts.length} ingredient(s) have potential conflicts with nearby events.`,
        }, null, 2),
      };
    }
    case "generate_purchase_draft": {
      const items = (input.shopping_items as Array<{ ingredient_name: string; quantity: number; unit: string }>) || [];
      const supabase = await createClient();

      // Fetch all product mappings for this user/org
      let mappingQuery = supabase
        .from("distributor_product_mappings")
        .select(`
          ingredient_name,
          conversion_factor,
          conversion_unit,
          is_preferred,
          distributor_products!inner(
            sku,
            name,
            pack_size,
            unit_price,
            distributor_id,
            distributors!inner(id, name)
          )
        `)
        .eq("distributor_products.distributors.user_id", ctx.userId);
      if (ctx.orgId) mappingQuery = mappingQuery.eq("organization_id", ctx.orgId);

      const { data: mappings } = await mappingQuery;

      // Build options map by ingredient name
      const optionsMap = new Map<string, Array<{
        distributorName: string;
        distributorId: string;
        sku: string;
        productName: string;
        packSize: string;
        unitPrice: number;
        conversionFactor: number;
        conversionUnit: string;
        isPreferred: boolean;
      }>>();

      for (const m of mappings || []) {
        const product = m.distributor_products as any;
        const distributor = product?.distributors;
        if (!product || !distributor) continue;

        const key = (m.ingredient_name || "").toLowerCase();
        const options = optionsMap.get(key) || [];
        options.push({
          distributorName: distributor.name,
          distributorId: distributor.id,
          sku: product.sku,
          productName: product.name,
          packSize: product.pack_size || "",
          unitPrice: product.unit_price || 0,
          conversionFactor: m.conversion_factor || 1,
          conversionUnit: m.conversion_unit || "",
          isPreferred: m.is_preferred || false,
        });
        optionsMap.set(key, options);
      }

      // Build shopping items in the expected format
      const shoppingItems = items.map((i) => ({
        ingredientName: i.ingredient_name,
        quantity: i.quantity,
        unit: i.unit,
        estimatedCost: 0,
        category: "Miscellaneous" as const,
        fromRecipes: [],
        purchaseQuantity: i.quantity,
      }));

      const draft = buildProcurementDraft(shoppingItems, optionsMap);

      const unmappedNote = draft.unmappedItems.length > 0
        ? ` ${draft.unmappedItems.length} items have no distributor mapping.`
        : "";

      return {
        result: `Purchase draft: ${draft.totalMappedItems} items across ${draft.totalDistributors} distributor(s). Est. cost: $${draft.totalEstimatedCost.toFixed(2)}.${unmappedNote}`,
        procurementDraft: draft,
      };
    }
    case "lookup_venue": {
      const venueName = (input.venue_name as string) || "";
      const supabase = await createClient();

      const { data: venues } = await supabase
        .from("venue_profiles")
        .select("*")
        .ilike("venue_name", `%${venueName}%`)
        .limit(5);

      if (!venues || venues.length === 0) {
        return { result: `No venues found matching "${venueName}". The user may need to add venue details or specify the venue differently.` };
      }

      return {
        result: JSON.stringify(
          venues.map((v) => ({
            name: v.venue_name,
            description: v.description,
            address: [v.address_line_1, v.city, v.state, v.postal_code].filter(Boolean).join(", "),
            capacitySeated: v.capacity_seated,
            capacityStanding: v.capacity_standing,
            indoorOutdoor: v.indoor_outdoor,
            amenities: v.amenities || [],
            parkingNotes: v.parking_notes,
            accessNotes: v.access_notes,
          })),
          null,
          2
        ),
      };
    }
    case "produce_prep_sheet": {
      const menuItems = (input.menu_items as Array<{ name: string; recipe_id?: string; quantity?: number; category?: string }>) || [];
      const guestCount = (input.guest_count as number) || 100;
      const supabase = await createClient();

      // Fetch recipes by ID or name (same logic as preview_prep_breakdown)
      const recipeMap = new Map<string, { name: string; servings: number; category?: string; station?: string | null; ingredients: Array<{ name: string; quantity: number; unit: string }> }>();

      const recipeIds = menuItems.map((m) => m.recipe_id).filter(Boolean) as string[];
      const recipeNames = menuItems.map((m) => m.name.toLowerCase());

      if (recipeIds.length > 0) {
        const { data } = await supabase
          .from("recipes")
          .select("id, name, servings, category, ingredients")
          .in("id", recipeIds)
          .eq("user_id", ctx.userId);
        for (const r of data || []) {
          recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, category: r.category, ingredients: r.ingredients as any[] });
        }
      }

      const unmatchedNames = recipeNames.filter((n) => !recipeMap.has(n));
      if (unmatchedNames.length > 0) {
        let q = supabase
          .from("recipes")
          .select("id, name, servings, category, ingredients")
          .eq("user_id", ctx.userId)
          .neq("status", "archived");
        if (ctx.orgId) q = q.eq("organization_id", ctx.orgId);
        const { data } = await q;
        for (const r of data || []) {
          if (unmatchedNames.includes(r.name.toLowerCase())) {
            recipeMap.set(r.name.toLowerCase(), { name: r.name, servings: r.servings, category: r.category, ingredients: r.ingredients as any[] });
          }
        }
      }

      // Build the prep preview (same as preview_prep_breakdown)
      const preview = buildPrepPreview(menuItems, recipeMap, guestCount);

      // Build a detailed production-ready output
      const stationSummary = Object.entries(preview.stationCounts)
        .map(([s, c]) => `${s.replace(/_/g, " ")}: ${c} tasks`)
        .join(", ");

      const dishDetails = preview.byDish.map((d) => {
        const items = d.items.map((it) => `  - ${it.componentName}: ${it.quantity.toFixed(1)} ${it.unit}`).join("\n");
        return `${d.dishName} (x${d.scaleFactor.toFixed(1)}):\n${items}`;
      }).join("\n\n");

      const result = [
        `Production sheet generated: ${preview.totalTasks} prep tasks across ${Object.keys(preview.stationCounts).length} stations`,
        `Stations: ${stationSummary}`,
        "",
        "--- Prep by Dish ---",
        dishDetails,
      ].join("\n");

      return {
        result,
        prepPreview: preview,
      };
    }
    case "update_extracted_entities": {
      const entityUpdate = normalizeToolUpdate(input);
      return { result: "Entities updated.", entityUpdate };
    }
    case "finalize_plan": {
      const planInput = input as { plan: CainEventPlan };
      const result = finalizePlan(ctx, planInput);
      return { result, plan: planInput.plan };
    }
    default:
      // Check if this is a write tool (propose_*)
      if (toolName.startsWith("propose_")) {
        const writeResult = await executeWriteTool(toolName, input, ctx);
        return writeResult;
      }
      return { result: `Unknown tool: ${toolName}` };
  }
}
