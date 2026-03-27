import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { safeParseDate } from "@/lib/utils";
import type { Event, PricingData, PaymentData } from "@/types";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  const orgId = org?.orgId ?? null;

  // Fetch all events
  let eventsQuery = supabase.from("events").select("*").eq("user_id", user.id);
  if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);
  const { data: allEvents } = await eventsQuery.order("event_date", { ascending: false });
  const events: Event[] = allEvents ?? [];

  // Fetch all clients
  let clientsQuery = supabase.from("clients").select("*").eq("user_id", user.id);
  if (orgId) clientsQuery = clientsQuery.eq("organization_id", orgId);
  const { data: allClients } = await clientsQuery;
  const clients = allClients ?? [];

  // Fetch all recipes
  let recipesQuery = supabase.from("recipes").select("*").eq("user_id", user.id);
  if (orgId) recipesQuery = recipesQuery.eq("organization_id", orgId);
  const { data: allRecipes } = await recipesQuery;
  const recipes = allRecipes ?? [];

  // Fetch all staff assignments with staff member info
  let staffQuery = supabase.from("event_staff_assignments").select("*, staff_member:staff_members(id, name, role)").eq("user_id", user.id);
  if (orgId) staffQuery = staffQuery.eq("organization_id", orgId);
  const { data: allStaffAssignments } = await staffQuery;
  const staffAssignments = allStaffAssignments ?? [];

  // Fetch all staff members
  let staffMembersQuery = supabase.from("staff_members").select("*").eq("user_id", user.id);
  if (orgId) staffMembersQuery = staffMembersQuery.eq("organization_id", orgId);
  const { data: allStaffMembers } = await staffMembersQuery;
  const staffMembers = allStaffMembers ?? [];

  // Fetch payments
  let paymentsQuery = supabase.from("payments").select("*");
  if (orgId) paymentsQuery = paymentsQuery.eq("organization_id", orgId);
  const { data: allPayments } = await paymentsQuery;
  const payments = allPayments ?? [];

  const now = new Date();

  // --- Revenue aggregation (last 12 months) ---
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const start = startOfMonth(d).toISOString();
    const end = endOfMonth(d).toISOString();
    const mEvents = events.filter(e =>
      e.event_date >= start && e.event_date <= end &&
      (e.status === "confirmed" || e.status === "completed")
    );
    const revenue = mEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
    const cost = mEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
    return {
      month: format(d, "MMM yyyy"),
      monthShort: format(d, "MMM"),
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      eventCount: mEvents.length,
    };
  });

  // Revenue by status
  const revenueByStatus = ["confirmed", "completed", "canceled"].map(status => {
    const filtered = events.filter(e => e.status === status);
    const total = filtered.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
    return { status, revenue: total, count: filtered.length };
  });

  // YTD revenue
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const ytdEvents = events.filter(e =>
    e.event_date >= yearStart && (e.status === "confirmed" || e.status === "completed")
  );
  const totalRevenueYTD = ytdEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
  const totalCostYTD = ytdEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
  const avgEventValue = ytdEvents.length > 0 ? totalRevenueYTD / ytdEvents.length : 0;

  // Revenue growth (compare last 3 months to prior 3 months)
  const last3 = monthlyRevenue.slice(-3).reduce((s, m) => s + m.revenue, 0);
  const prior3 = monthlyRevenue.slice(-6, -3).reduce((s, m) => s + m.revenue, 0);
  const revenueGrowth = prior3 > 0 ? ((last3 - prior3) / prior3) * 100 : last3 > 0 ? 100 : 0;

  // --- Client aggregation ---
  const clientRevenue = clients.map(c => {
    const clientEvents = events.filter(e => e.client_id === c.id && (e.status === "confirmed" || e.status === "completed"));
    const lifetimeRevenue = clientEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      company: c.company_name,
      eventCount: clientEvents.length,
      lifetimeRevenue,
      status: c.status,
    };
  });

  const top10Clients = [...clientRevenue].sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue).slice(0, 10);

  // Client acquisition by month (last 12 months)
  const clientAcquisition = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const start = startOfMonth(d).toISOString();
    const end = endOfMonth(d).toISOString();
    const newClients = clients.filter(c => c.created_at >= start && c.created_at <= end);
    return { month: format(d, "MMM"), count: newClients.length };
  });

  const activeClients = clients.filter(c => c.status === "active").length;
  const repeatClients = clientRevenue.filter(c => c.eventCount > 1).length;
  const repeatRate = clients.length > 0 ? (repeatClients / clients.length) * 100 : 0;
  const avgClientValue = clients.length > 0 ? clientRevenue.reduce((s, c) => s + c.lifetimeRevenue, 0) / clients.length : 0;

  const clientStatusBreakdown = ["lead", "active", "past", "archived"].map(status => ({
    status,
    count: clients.filter(c => c.status === status).length,
  }));

  // --- Events aggregation ---
  const eventsByMonth = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const start = startOfMonth(d).toISOString();
    const end = endOfMonth(d).toISOString();
    const monthEvents = events.filter(e => e.event_date >= start && e.event_date <= end);
    const byStatus: Record<string, number> = {};
    for (const e of monthEvents) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    }
    return { month: format(d, "MMM"), total: monthEvents.length, ...byStatus };
  });

  const totalEvents = events.length;
  const avgGuestCount = events.length > 0 ? Math.round(events.reduce((s, e) => s + (e.guest_count ?? 0), 0) / events.length) : 0;
  const completedEvents = events.filter(e => e.status === "completed").length;
  const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
  const avgEventVal = totalEvents > 0 ? events.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0) / totalEvents : 0;

  // Busiest months
  const monthCounts: Record<string, number> = {};
  for (const e of events) {
    const m = format(safeParseDate(e.event_date), "MMMM");
    monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  }
  const busiestMonths = Object.entries(monthCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([month, count]) => ({ month, count }));

  // Most popular venues
  const venueCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.venue) {
      venueCounts[e.venue] = (venueCounts[e.venue] ?? 0) + 1;
    }
  }
  const topVenues = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([venue, count]) => ({ venue, count }));

  // --- Profitability ---
  const eventsWithMargins = events
    .filter(e => (e.pricing_data as PricingData)?.suggestedPrice > 0)
    .map(e => {
      const p = e.pricing_data as PricingData;
      const revenue = p.suggestedPrice;
      const cost = p.totalCost;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { id: e.id, name: e.name, client_name: e.client_name, revenue, cost, profit, margin, foodCost: p.foodCostTotal ?? 0 };
    });

  const top5Profitable = [...eventsWithMargins].sort((a, b) => b.margin - a.margin).slice(0, 5);
  const bottom5Profitable = [...eventsWithMargins].sort((a, b) => a.margin - b.margin).slice(0, 5);

  const avgMargin = eventsWithMargins.length > 0 ? eventsWithMargins.reduce((s, e) => s + e.margin, 0) / eventsWithMargins.length : 0;
  const bestMargin = eventsWithMargins.length > 0 ? Math.max(...eventsWithMargins.map(e => e.margin)) : 0;
  const totalProfit = eventsWithMargins.reduce((s, e) => s + e.profit, 0);
  const totalFoodCost = eventsWithMargins.reduce((s, e) => s + e.foodCost, 0);
  const totalRevForFoodPct = eventsWithMargins.reduce((s, e) => s + e.revenue, 0);
  const foodCostPct = totalRevForFoodPct > 0 ? (totalFoodCost / totalRevForFoodPct) * 100 : 0;

  // Margin distribution (buckets: <10%, 10-20%, 20-30%, 30-40%, 40-50%, 50%+)
  const marginBuckets = [
    { range: "<10%", min: -Infinity, max: 10 },
    { range: "10-20%", min: 10, max: 20 },
    { range: "20-30%", min: 20, max: 30 },
    { range: "30-40%", min: 30, max: 40 },
    { range: "40-50%", min: 40, max: 50 },
    { range: "50%+", min: 50, max: Infinity },
  ].map(b => ({
    range: b.range,
    count: eventsWithMargins.filter(e => e.margin >= b.min && e.margin < b.max).length,
  }));

  // Margin trend by month
  const marginTrend = monthlyRevenue.map(m => ({
    month: m.monthShort,
    margin: m.margin,
  }));

  // --- Staff aggregation ---
  const staffEventCounts: Record<string, { name: string; role: string; count: number }> = {};
  for (const sa of staffAssignments) {
    const sm = sa.staff_member as any;
    const memberId = sa.staff_member_id;
    if (!staffEventCounts[memberId]) {
      staffEventCounts[memberId] = { name: sm?.name ?? "Unknown", role: sm?.role ?? "", count: 0 };
    }
    staffEventCounts[memberId].count++;
  }
  const staffUtilization = Object.values(staffEventCounts).sort((a, b) => b.count - a.count);
  const totalStaff = staffMembers.length;
  const avgEventsPerStaff = totalStaff > 0 ? staffAssignments.length / totalStaff : 0;
  const mostActiveStaff = staffUtilization.length > 0 ? staffUtilization[0].name : "N/A";

  return (
    <ReportsClient
      data={{
        // Revenue
        monthlyRevenue,
        revenueByStatus,
        totalRevenueYTD,
        avgEventValue,
        revenueGrowth,
        // Clients
        top10Clients,
        clientAcquisition,
        totalClients: clients.length,
        activeClients,
        avgClientValue,
        repeatRate,
        clientStatusBreakdown,
        // Events
        eventsByMonth,
        totalEvents,
        avgGuestCount,
        completionRate,
        avgEventVal,
        busiestMonths,
        topVenues,
        // Profitability
        marginBuckets,
        top5Profitable,
        bottom5Profitable,
        avgMargin,
        bestMargin,
        totalProfit,
        foodCostPct,
        marginTrend,
        // Staff
        staffUtilization,
        totalStaff,
        avgEventsPerStaff,
        mostActiveStaff,
      }}
    />
  );
}
