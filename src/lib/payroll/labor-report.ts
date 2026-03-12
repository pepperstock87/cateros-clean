// Event-Level Labor Margin Reporting
//
// Calculates labor costs per event and compares against revenue
// to provide real margin analysis. This is the bridge between
// event pricing and actual payroll costs.

import { createClient } from "@/lib/supabase/server";
import { domainEvents } from "@/lib/events";
import type { EventLaborReport } from "./types";

/**
 * Generate a labor report for a single event.
 */
export async function getEventLaborReport(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
}): Promise<EventLaborReport | { error: string }> {
  const supabase = await createClient();

  // Get event with pricing
  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_date, guest_count, pricing_data")
    .eq("id", params.eventId)
    .eq("user_id", params.userId)
    .single();

  if (!event) return { error: "Event not found" };

  const pricing = event.pricing_data;
  const revenue = pricing?.suggestedPrice ?? 0;

  // Get actual staff assignments with rates
  const { data: assignments } = await supabase
    .from("event_staff_assignments")
    .select("*, staff_members(id, name, role, hourly_rate)")
    .eq("event_id", params.eventId);

  // Check for approved hours exports
  const { data: hoursExports } = await supabase
    .from("payroll_hours_exports")
    .select("*")
    .eq("event_id", params.eventId)
    .eq("user_id", params.userId)
    .in("status", ["approved", "processed"])
    .order("created_at", { ascending: false })
    .limit(1);

  let staffBreakdown: EventLaborReport["staffBreakdown"] = [];
  let laborCost = 0;

  if (hoursExports && hoursExports.length > 0) {
    // Use approved hours (most accurate)
    const items = hoursExports[0].line_items as Array<{
      staff_name: string;
      role: string;
      regular_hours: number;
      overtime_hours: number;
      hourly_rate: number;
      total_pay: number;
    }>;

    staffBreakdown = items.map((i) => ({
      staffName: i.staff_name,
      role: i.role,
      hours: i.regular_hours + i.overtime_hours,
      rate: i.hourly_rate,
      cost: i.total_pay,
    }));
    laborCost = items.reduce((sum, i) => sum + i.total_pay, 0);
  } else if (assignments && assignments.length > 0) {
    // Fall back to planned hours from assignments
    for (const a of assignments) {
      const staff = a.staff_members as any;
      if (!staff) continue;

      let hours = 0;
      if (a.start_time && a.end_time) {
        const [sh, sm] = a.start_time.split(":").map(Number);
        const [eh, em] = a.end_time.split(":").map(Number);
        hours = Math.max(0, ((eh || 0) * 60 + (em || 0) - (sh || 0) * 60 - (sm || 0)) / 60);
      }
      if (hours === 0) hours = 8; // default

      const rate = staff.hourly_rate || 0;
      const cost = hours * rate;

      staffBreakdown.push({
        staffName: staff.name,
        role: a.role || staff.role,
        hours,
        rate,
        cost,
      });
      laborCost += cost;
    }
  } else if (pricing?.staffing) {
    // Fall back to pricing data estimates
    for (const s of pricing.staffing) {
      const cost = s.hourlyRate * s.hours * s.headcount;
      staffBreakdown.push({
        staffName: `${s.headcount}x ${s.role}`,
        role: s.role,
        hours: s.hours * s.headcount,
        rate: s.hourlyRate,
        cost,
      });
      laborCost += cost;
    }
  }

  const guestCount = event.guest_count || 1;
  const laborPercent = revenue > 0 ? laborCost / revenue : 0;
  const margin = pricing?.projectedMargin ?? 0;
  const totalCost = pricing?.totalCost ?? 0;
  const marginWithLabor = revenue > 0 ? (revenue - totalCost) / revenue : 0;

  const report: EventLaborReport = {
    eventId: event.id,
    eventName: event.name,
    eventDate: event.event_date,
    guestCount,
    revenue,
    laborCost,
    laborCostPerGuest: laborCost / guestCount,
    laborPercent,
    staffBreakdown,
    margin,
    marginWithLabor,
  };

  // Check margin threshold
  const targetMargin = pricing?.targetMarginPercent ? pricing.targetMarginPercent / 100 : 0.28;
  if (marginWithLabor < targetMargin && revenue > 0) {
    domainEvents.emit(
      "margin.threshold.triggered",
      {
        eventId: event.id,
        userId: params.userId,
        orgId: params.orgId,
        currentMargin: marginWithLabor,
        targetMargin,
        suggestedPrice: revenue,
        totalCost,
      },
      "payroll/labor-report"
    ).catch(() => {}); // fire-and-forget
  }

  return report;
}

/**
 * Generate labor reports for multiple events (for dashboard/analytics).
 */
export async function getMultiEventLaborReport(params: {
  userId: string;
  orgId: string | null;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{
  events: EventLaborReport[];
  totals: {
    totalRevenue: number;
    totalLaborCost: number;
    averageLaborPercent: number;
    averageMargin: number;
  };
}> {
  const supabase = await createClient();

  let q = supabase
    .from("events")
    .select("id")
    .eq("user_id", params.userId)
    .in("status", ["confirmed", "completed"])
    .not("pricing_data", "is", null);

  if (params.orgId) q = q.eq("organization_id", params.orgId);
  if (params.startDate) q = q.gte("event_date", params.startDate);
  if (params.endDate) q = q.lte("event_date", params.endDate);

  q = q.order("event_date", { ascending: false }).limit(params.limit ?? 20);

  const { data: events } = await q;
  if (!events || events.length === 0) {
    return {
      events: [],
      totals: { totalRevenue: 0, totalLaborCost: 0, averageLaborPercent: 0, averageMargin: 0 },
    };
  }

  const reports: EventLaborReport[] = [];
  for (const event of events) {
    const report = await getEventLaborReport({
      userId: params.userId,
      orgId: params.orgId,
      eventId: event.id,
    });
    if (!("error" in report)) {
      reports.push(report);
    }
  }

  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
  const totalLaborCost = reports.reduce((sum, r) => sum + r.laborCost, 0);

  return {
    events: reports,
    totals: {
      totalRevenue,
      totalLaborCost,
      averageLaborPercent: totalRevenue > 0 ? totalLaborCost / totalRevenue : 0,
      averageMargin:
        reports.length > 0
          ? reports.reduce((sum, r) => sum + r.marginWithLabor, 0) / reports.length
          : 0,
    },
  };
}
