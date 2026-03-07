import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";

export async function buildSystemPrompt(userId: string): Promise<string> {
  const supabase = await createClient();
  const org = await getCurrentOrg();

  let eventsQuery = supabase
    .from("events")
    .select("name, event_date, guest_count, status, pricing_data")
    .eq("user_id", userId);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);

  let recipesQuery = supabase
    .from("recipes")
    .select("name, cost_per_serving, category")
    .eq("user_id", userId);
  if (org?.orgId) recipesQuery = recipesQuery.eq("organization_id", org.orgId);

  let receiptsQuery = supabase
    .from("receipts")
    .select("vendor, date, amount, category")
    .eq("user_id", userId);
  if (org?.orgId) receiptsQuery = receiptsQuery.eq("organization_id", org.orgId);

  let invoicesQuery = supabase
    .from("distributor_invoices")
    .select("distributor, invoice_date, total")
    .eq("user_id", userId);
  if (org?.orgId) invoicesQuery = invoicesQuery.eq("organization_id", org.orgId);

  const [profileRes, eventsRes, recipesRes, receiptsRes, invoicesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, company_name, plan_tier")
      .eq("id", userId)
      .single(),
    eventsQuery
      .order("event_date", { ascending: false })
      .limit(10),
    recipesQuery
      .limit(20),
    receiptsQuery
      .order("date", { ascending: false })
      .limit(15),
    invoicesQuery
      .order("invoice_date", { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const events = eventsRes.data ?? [];
  const recipes = recipesRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  // --- Aggregate stats ---
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter((e) => e.event_date && e.event_date >= today);

  const totalRevenue = events.reduce((sum, e) => {
    const pd = e.pricing_data as Record<string, any> | null;
    return sum + (pd?.total ?? pd?.revenue ?? 0);
  }, 0);

  const totalCost = events.reduce((sum, e) => {
    const pd = e.pricing_data as Record<string, any> | null;
    return sum + (pd?.cost ?? 0);
  }, 0);

  const avgMargin =
    totalRevenue > 0
      ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1)
      : "N/A";

  // --- Format events as markdown table ---
  let eventsSection: string;
  if (events.length === 0) {
    eventsSection = "No events yet.";
  } else {
    const header = "| Event | Date | Guests | Status | Revenue |";
    const sep = "|---|---|---|---|---|";
    const rows = events.map((e) => {
      const pd = e.pricing_data as Record<string, any> | null;
      const rev = pd?.total ?? pd?.revenue ?? "—";
      const revStr = typeof rev === "number" ? `$${rev.toLocaleString()}` : rev;
      return `| ${e.name} | ${e.event_date ?? "TBD"} | ${e.guest_count ?? "—"} | ${e.status ?? "draft"} | ${revStr} |`;
    });
    eventsSection = [header, sep, ...rows].join("\n");
  }

  // --- Format recipes as bullet list ---
  let recipesSection: string;
  if (recipes.length === 0) {
    recipesSection = "No recipes yet.";
  } else {
    recipesSection = recipes
      .map((r) => {
        const cost =
          r.cost_per_serving != null
            ? `$${Number(r.cost_per_serving).toFixed(2)}/serving`
            : "no cost data";
        return `- **${r.name}** (${r.category ?? "uncategorized"}) — ${cost}`;
      })
      .join("\n");
  }

  // --- Format spending as summary ---
  const receiptTotal = receipts.reduce((s, r) => s + (r.amount ?? 0), 0);
  const invoiceTotal = invoices.reduce((s, i) => s + (i.total ?? 0), 0);

  // Top vendors by total spend
  const vendorMap = new Map<string, number>();
  for (const r of receipts) {
    if (r.vendor) {
      vendorMap.set(r.vendor, (vendorMap.get(r.vendor) ?? 0) + (r.amount ?? 0));
    }
  }
  for (const i of invoices) {
    if (i.distributor) {
      vendorMap.set(i.distributor, (vendorMap.get(i.distributor) ?? 0) + (i.total ?? 0));
    }
  }
  const topVendors = [...vendorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amt]) => `${name}: $${amt.toLocaleString()}`)
    .join(", ");

  const spendingSection = [
    `- Receipts: ${receipts.length} totaling $${receiptTotal.toLocaleString()}`,
    `- Invoices: ${invoices.length} totaling $${invoiceTotal.toLocaleString()}`,
    topVendors ? `- Top vendors: ${topVendors}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are the CaterOS AI assistant for ${profile?.company_name ?? "a catering business"}.
You are a catering industry expert — professional, numbers-focused, and practical.
Never guess at numbers; only reference data provided below.
Always cite specific figures when answering financial questions.
When suggesting prices, show your math. Help with pricing math, suggest menu ideas, and help optimize profitability.
You can recommend portion sizes, ingredient substitutions, and cost-saving strategies.

When the user asks you to create an event or recipe, return a JSON block wrapped in \`\`\`json ... \`\`\` with this format:
{ "action": "create_event" | "create_recipe", "data": { ... }, "confirmation_message": "..." }

## Business Context
- Owner: ${profile?.full_name ?? "Unknown"}
- Company: ${profile?.company_name ?? "Unknown"}
- Plan: ${profile?.plan_tier ?? "basic"}

## Aggregate Stats
- Total events: ${events.length} (${upcomingEvents.length} upcoming)
- Total revenue: $${totalRevenue.toLocaleString()}
- Avg margin: ${avgMargin}%
- Recipe count: ${recipes.length}

## Recent Events
${eventsSection}

## Recipe Library
${recipesSection}

## Spending Summary
${spendingSection}

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
}
