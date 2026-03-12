// CAIN Agent Memory & Context System
//
// Provides structured context that CAIN can use for reasoning.
// Three context levels:
//   1. Company — business defaults, settings, recurring patterns
//   2. Client  — history, preferences, dietary needs, past events
//   3. Event   — current plan state, timeline, pricing, staff
//
// Context is assembled on-demand and injected into the system prompt
// or passed as tool results. It's read-only — CAIN reads context
// but writes only through tools with proper permissions.

import { createClient } from "@/lib/supabase/server";
import { DEFAULTS } from "@/lib/constants";

// ─── Context Types ───

export interface CompanyContext {
  businessName: string | null;
  adminFeePercent: number;
  taxRatePercent: number;
  targetMarginPercent: number;
  depositPercent: number;
  serviceChargePercent: number | null;
  paymentTerms: string | null;
  cancellationPolicy: string | null;
  recipeCount: number;
  staffCount: number;
  inventoryItemCount: number;
  clientCount: number;
  eventCount: number;
  topRecipeCategories: string[];
  staffRoles: string[];
}

export interface ClientContext {
  clientId: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  dietaryNotes: string | null;
  tags: string[];
  status: string;
  eventHistory: Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    guestCount: number;
    suggestedPrice: number | null;
    status: string;
  }>;
  totalEventsValue: number;
  averageGuestCount: number;
}

export interface EventContext {
  eventId: string;
  name: string;
  clientName: string;
  eventDate: string;
  guestCount: number;
  venue: string | null;
  status: string;
  hasPricing: boolean;
  suggestedPrice: number | null;
  totalCost: number | null;
  projectedMargin: number | null;
  staffAssigned: number;
  hasTimeline: boolean;
  hasProposal: boolean;
  proposalStatus: string | null;
  totalPaid: number;
  totalDue: number;
  notes: string | null;
}

// ─── Context Builders ───

export async function buildCompanyContext(
  userId: string,
  orgId: string | null
): Promise<CompanyContext> {
  const supabase = await createClient();

  const [settingsRes, recipeRes, staffRes, inventoryRes, clientRes, eventRes, categoryRes, rolesRes] =
    await Promise.all([
      supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("inventory")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("recipes")
        .select("category")
        .eq("user_id", userId)
        .not("category", "is", null)
        .limit(100),
      supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", userId)
        .limit(100),
    ]);

  const settings = settingsRes.data;

  // Deduplicate categories and roles
  const categories = [...new Set((categoryRes.data ?? []).map((r) => r.category).filter(Boolean))] as string[];
  const roles = [...new Set((rolesRes.data ?? []).map((s) => s.role).filter(Boolean))] as string[];

  return {
    businessName: settings?.business_name ?? null,
    adminFeePercent: settings?.default_admin_fee ?? DEFAULTS.ADMIN_FEE_PERCENT,
    taxRatePercent: settings?.default_tax_rate ?? DEFAULTS.TAX_RATE_PERCENT,
    targetMarginPercent: settings?.default_target_margin ?? DEFAULTS.PROFIT_MARGIN_PERCENT,
    depositPercent: settings?.default_deposit_percent ?? 50,
    serviceChargePercent: settings?.service_charge_percent ?? null,
    paymentTerms: settings?.payment_terms ?? null,
    cancellationPolicy: settings?.cancellation_policy ?? null,
    recipeCount: recipeRes.count ?? 0,
    staffCount: staffRes.count ?? 0,
    inventoryItemCount: inventoryRes.count ?? 0,
    clientCount: clientRes.count ?? 0,
    eventCount: eventRes.count ?? 0,
    topRecipeCategories: categories,
    staffRoles: roles,
  };
}

export async function buildClientContext(
  userId: string,
  clientId: string
): Promise<ClientContext | null> {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", userId)
    .single();

  if (!client) return null;

  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_date, guest_count, pricing_data, status")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("event_date", { ascending: false })
    .limit(20);

  const eventHistory = (events ?? []).map((e) => ({
    eventId: e.id,
    eventName: e.name,
    eventDate: e.event_date,
    guestCount: e.guest_count,
    suggestedPrice: e.pricing_data?.suggestedPrice ?? null,
    status: e.status,
  }));

  const totalValue = eventHistory.reduce((sum, e) => sum + (e.suggestedPrice ?? 0), 0);
  const avgGuests =
    eventHistory.length > 0
      ? Math.round(eventHistory.reduce((sum, e) => sum + e.guestCount, 0) / eventHistory.length)
      : 0;

  return {
    clientId: client.id,
    name: `${client.first_name} ${client.last_name}`,
    company: client.company_name,
    email: client.email,
    phone: client.phone,
    dietaryNotes: client.dietary_notes,
    tags: client.tags ?? [],
    status: client.status,
    eventHistory,
    totalEventsValue: totalValue,
    averageGuestCount: avgGuests,
  };
}

export async function buildEventContext(
  userId: string,
  eventId: string
): Promise<EventContext | null> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single();

  if (!event) return null;

  const [staffRes, timelineRes, proposalRes, paymentsRes] = await Promise.all([
    supabase
      .from("event_staff_assignments")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("event_timeline_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("proposals")
      .select("id, status")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("payments")
      .select("amount, status")
      .eq("event_id", eventId)
      .eq("status", "paid"),
  ]);

  const pricing = event.pricing_data;
  const totalPaid = (paymentsRes.data ?? []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const totalDue = (pricing?.suggestedPrice ?? 0) - totalPaid;

  return {
    eventId: event.id,
    name: event.name,
    clientName: event.client_name,
    eventDate: event.event_date,
    guestCount: event.guest_count,
    venue: event.venue,
    status: event.status,
    hasPricing: !!pricing,
    suggestedPrice: pricing?.suggestedPrice ?? null,
    totalCost: pricing?.totalCost ?? null,
    projectedMargin: pricing?.projectedMargin ?? null,
    staffAssigned: staffRes.count ?? 0,
    hasTimeline: (timelineRes.count ?? 0) > 0,
    hasProposal: (proposalRes.data?.length ?? 0) > 0,
    proposalStatus: proposalRes.data?.[0]?.status ?? null,
    totalPaid,
    totalDue: Math.max(0, totalDue),
    notes: event.notes,
  };
}

/**
 * Build a complete context string for injection into CAIN's system prompt.
 * Used for conversational CAIN interactions beyond event planning.
 */
export async function buildFullContext(params: {
  userId: string;
  orgId: string | null;
  eventId?: string;
  clientId?: string;
}): Promise<string> {
  const sections: string[] = [];

  const company = await buildCompanyContext(params.userId, params.orgId);
  sections.push(`## Company Context
- Business: ${company.businessName || "Not set"}
- Recipes: ${company.recipeCount} | Staff: ${company.staffCount} | Inventory: ${company.inventoryItemCount}
- Clients: ${company.clientCount} | Events: ${company.eventCount}
- Rates: Admin ${company.adminFeePercent}% | Tax ${company.taxRatePercent}% | Margin ${company.targetMarginPercent}%
- Recipe categories: ${company.topRecipeCategories.join(", ") || "None"}
- Staff roles: ${company.staffRoles.join(", ") || "None"}`);

  if (params.clientId) {
    const client = await buildClientContext(params.userId, params.clientId);
    if (client) {
      sections.push(`## Client Context: ${client.name}
- Company: ${client.company || "N/A"} | Status: ${client.status}
- Dietary notes: ${client.dietaryNotes || "None"}
- Tags: ${client.tags.join(", ") || "None"}
- Past events: ${client.eventHistory.length} | Total value: $${client.totalEventsValue.toLocaleString()}
- Average guest count: ${client.averageGuestCount}`);
    }
  }

  if (params.eventId) {
    const event = await buildEventContext(params.userId, params.eventId);
    if (event) {
      sections.push(`## Event Context: ${event.name}
- Date: ${event.eventDate} | Guests: ${event.guestCount} | Status: ${event.status}
- Venue: ${event.venue || "TBD"}
- Pricing: ${event.hasPricing ? `$${event.suggestedPrice?.toLocaleString()} (cost: $${event.totalCost?.toLocaleString()}, margin: ${((event.projectedMargin ?? 0) * 100).toFixed(1)}%)` : "Not set"}
- Staff assigned: ${event.staffAssigned} | Timeline: ${event.hasTimeline ? "Yes" : "No"}
- Proposal: ${event.hasProposal ? event.proposalStatus : "None"}
- Payments: $${event.totalPaid.toLocaleString()} paid, $${event.totalDue.toLocaleString()} remaining`);
    }
  }

  return sections.join("\n\n");
}
