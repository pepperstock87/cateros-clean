import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";
import { getEventLaborReport } from "@/lib/payroll/labor-report";
import { getConnection as getQBConnection } from "@/lib/quickbooks/auth";
import { getRecentSyncLogs } from "@/lib/quickbooks/queue";
import { getConnection as getPayrollConnection } from "@/lib/payroll/auth";
import { getAllMappings as getPayrollMappings } from "@/lib/payroll/mapping";
import type { CainEventPlan } from "../types";

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
    .select("id, name, description, category, servings, cost_per_serving, total_cost, ingredients")
    .eq("user_id", ctx.userId);

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
): Promise<{ result: string; plan?: CainEventPlan }> {
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
    case "finalize_plan": {
      const planInput = input as { plan: CainEventPlan };
      const result = finalizePlan(ctx, planInput);
      return { result, plan: planInput.plan };
    }
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
