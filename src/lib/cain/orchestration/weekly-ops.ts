/**
 * Weekly Operations Briefing
 * High-level view of business state for the upcoming week
 */

import { createClient } from "@/lib/supabase/server";

export interface WeeklyBriefingEvent {
  eventId: string;
  name: string;
  date: string;
  clientName: string;
  guestCount: number;
  status: string;
  readiness: "ready" | "needs_attention" | "critical";
  issues: string[];
}

export interface StaffingConflict {
  staffName: string;
  date: string;
  events: string[];
}

export interface WeeklyBriefingStaffing {
  totalStaffNeeded: number;
  uniqueStaffAssigned: number;
  conflicts: StaffingConflict[];
  unassignedShifts: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  projectedMargin: number;
  outstandingPayments: number;
  overduePayments: number;
}

export interface WeeklyBriefing {
  weekOf: string; // "March 23, 2026"
  upcomingEvents: WeeklyBriefingEvent[];
  staffUtilization: WeeklyBriefingStaffing;
  financialSummary: FinancialSummary;
  actionItems: string[];
  risks: string[];
}

/**
 * Generate a weekly operations briefing for a user
 */
export async function generateWeeklyBriefing(
  userId: string,
  orgId: string | null,
  weekStartDate?: string // Default: next Monday
): Promise<WeeklyBriefing> {
  const supabase = await createClient();

  // Calculate week boundaries
  let startDate: Date;
  if (weekStartDate) {
    startDate = new Date(weekStartDate);
  } else {
    startDate = new Date();
    // Find next Monday
    const dayOfWeek = startDate.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    startDate.setDate(startDate.getDate() + daysUntilMonday);
  }
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const weekOfStr = startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Fetch events for the week
  let eventsQuery = supabase
    .from("events")
    .select("id, name, event_date, client_name, guest_count, status, pricing_data")
    .eq("user_id", userId)
    .neq("status", "canceled")
    .gte("event_date", startDate.toISOString())
    .lt("event_date", endDate.toISOString())
    .order("event_date", { ascending: true });

  if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);

  const { data: events, error: eventsError } = await eventsQuery;

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
    return createEmptyBriefing(weekOfStr);
  }

  const eventsList = events || [];
  const upcomingEvents: WeeklyBriefingEvent[] = [];
  const staffingMap = new Map<string, { date: string; eventId: string; eventName: string }[]>();
  let totalStaffNeeded = 0;
  let totalCost = 0;
  let totalRevenue = 0;
  let outstandingPayments = 0;
  let overduePayments = 0;
  const actionItems: string[] = [];
  const risks: string[] = [];

  // Process each event
  for (const event of eventsList) {
    const eventDate = event.event_date instanceof Date ? event.event_date.toISOString().split("T")[0] : event.event_date.split("T")[0];

    // Get staff assignments for this event
    const { data: staffAssignments } = await supabase
      .from("event_staff_assignments")
      .select("staff_member_id, staff_members(name)")
      .eq("event_id", event.id);

    const staffCount = staffAssignments?.length ?? 0;
    const pricing = event.pricing_data as any;

    // Calculate financials
    const eventRevenue = pricing?.suggestedPrice || 0;
    const eventCost = pricing?.totalCost || 0;
    const amountPaid = pricing?.amountPaid || 0;

    totalRevenue += eventRevenue;
    totalCost += eventCost;
    const outstandingBalance = eventRevenue - amountPaid;
    if (outstandingBalance > 0) {
      outstandingPayments += outstandingBalance;
    }

    // Track staff for this event
    if (staffAssignments) {
      for (const assignment of staffAssignments) {
        const staffName = (assignment as any).staff_members?.name || "Unknown";
        const key = staffName;
        if (!staffingMap.has(key)) {
          staffingMap.set(key, []);
        }
        staffingMap.get(key)!.push({
          date: eventDate,
          eventId: event.id,
          eventName: event.name,
        });
      }
    }

    // Determine readiness
    const requiredStaff = Math.ceil(event.guest_count / 25); // 1 staff per 25 guests
    const issues: string[] = [];

    if (staffCount === 0) {
      issues.push("No staff assigned");
      risks.push(`${event.name}: No staff assigned for ${event.guest_count} guests`);
    } else if (staffCount < requiredStaff) {
      issues.push(`Understaffed: ${staffCount} of ${requiredStaff} needed`);
      risks.push(`${event.name}: Understaffed (${staffCount}/${requiredStaff})`);
    }

    if (outstandingBalance > 0) {
      issues.push(`Outstanding balance: $${outstandingBalance.toFixed(2)}`);
      actionItems.push(`Collect payment for ${event.name}: $${outstandingBalance.toFixed(2)}`);
    }

    if (eventCost > eventRevenue) {
      issues.push("Event cost exceeds revenue");
      risks.push(`${event.name}: Cost exceeds revenue (${((eventCost / eventRevenue) * 100).toFixed(0)}%)`);
    }

    const readiness: "ready" | "needs_attention" | "critical" = issues.length === 0 ? "ready" : issues.length > 2 ? "critical" : "needs_attention";

    totalStaffNeeded += requiredStaff;

    upcomingEvents.push({
      eventId: event.id,
      name: event.name,
      date: eventDate,
      clientName: event.client_name,
      guestCount: event.guest_count,
      status: event.status,
      readiness,
      issues,
    });
  }

  // Detect staff conflicts (same person, same day, multiple events)
  const conflicts: StaffingConflict[] = [];
  for (const [staffName, assignments] of staffingMap) {
    const byDate = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      if (!byDate.has(assignment.date)) {
        byDate.set(assignment.date, []);
      }
      byDate.get(assignment.date)!.push(assignment);
    }

    for (const [date, dateAssignments] of byDate) {
      if (dateAssignments.length > 1) {
        conflicts.push({
          staffName,
          date,
          events: dateAssignments.map((a) => a.eventName),
        });
        risks.push(`${staffName}: Assigned to ${dateAssignments.length} events on ${date}`);
      }
    }
  }

  const uniqueStaffAssigned = staffingMap.size;
  const unassignedShifts = Math.max(0, totalStaffNeeded - uniqueStaffAssigned);

  const projectedMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;

  // Add action items
  if (outstandingPayments > 0) {
    actionItems.push(`Follow up on ${outstandingPayments > 1000 ? "large" : "outstanding"} payments: $${outstandingPayments.toFixed(2)}`);
  }

  if (conflicts.length > 0) {
    actionItems.push(`Resolve ${conflicts.length} staff scheduling conflict(s)`);
  }

  if (unassignedShifts > 0) {
    actionItems.push(`Assign staff to ${unassignedShifts} open shift(s)`);
  }

  return {
    weekOf: weekOfStr,
    upcomingEvents,
    staffUtilization: {
      totalStaffNeeded,
      uniqueStaffAssigned,
      conflicts,
      unassignedShifts,
    },
    financialSummary: {
      totalRevenue,
      totalCost,
      projectedMargin,
      outstandingPayments,
      overduePayments,
    },
    actionItems,
    risks,
  };
}

/**
 * Helper: create empty briefing structure
 */
function createEmptyBriefing(weekOf: string): WeeklyBriefing {
  return {
    weekOf,
    upcomingEvents: [],
    staffUtilization: {
      totalStaffNeeded: 0,
      uniqueStaffAssigned: 0,
      conflicts: [],
      unassignedShifts: 0,
    },
    financialSummary: {
      totalRevenue: 0,
      totalCost: 0,
      projectedMargin: 0,
      outstandingPayments: 0,
      overduePayments: 0,
    },
    actionItems: [],
    risks: [],
  };
}
