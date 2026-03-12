// Hours Export Service
//
// Collects approved staff hours from events and exports them to Gusto.
// The flow: collect hours → user approves → export to Gusto payroll.
// Supports both W-2 employees (via payroll) and 1099 contractors (via contractor payments).

import { createClient } from "@/lib/supabase/server";
import { GustoClient } from "./client";
import { getPayrollId } from "./mapping";
import { domainEvents } from "@/lib/events";
import type { PayrollHoursExport, PayrollHoursLineItem } from "./types";

/**
 * Collect hours from an event's staff assignments.
 * Creates a draft hours export for user review/approval.
 */
export async function collectEventHours(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
}): Promise<PayrollHoursExport | { error: string }> {
  const supabase = await createClient();

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_date, guest_count, pricing_data")
    .eq("id", params.eventId)
    .eq("user_id", params.userId)
    .single();

  if (!event) return { error: "Event not found" };

  // Get staff assignments with staff member details
  const { data: assignments } = await supabase
    .from("event_staff_assignments")
    .select("*, staff_members(id, name, role, hourly_rate)")
    .eq("event_id", params.eventId);

  if (!assignments || assignments.length === 0) {
    return { error: "No staff assignments found for this event" };
  }

  // Build line items from assignments
  const lineItems: PayrollHoursLineItem[] = [];
  let totalHours = 0;
  let totalCost = 0;

  for (const a of assignments) {
    const staff = a.staff_members as any;
    if (!staff) continue;

    // Calculate hours from start_time / end_time if available
    let hours = 0;
    if (a.start_time && a.end_time) {
      const start = parseTimeToMinutes(a.start_time);
      const end = parseTimeToMinutes(a.end_time);
      hours = Math.max(0, (end - start) / 60);
    }

    // Fall back to pricing data staffing hours
    if (hours === 0 && event.pricing_data?.staffing) {
      const pricingStaff = event.pricing_data.staffing.find(
        (s: any) => s.role?.toLowerCase() === staff.role?.toLowerCase()
      );
      if (pricingStaff) {
        hours = pricingStaff.hours;
      }
    }

    // Default to 8 hours if nothing else
    if (hours === 0) hours = 8;

    const rate = staff.hourly_rate || 0;
    const regularHours = Math.min(hours, 8);
    const overtimeHours = Math.max(0, hours - 8);
    const pay = regularHours * rate + overtimeHours * rate * 1.5;

    lineItems.push({
      staff_member_id: staff.id,
      staff_name: staff.name,
      role: a.role || staff.role,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      hourly_rate: rate,
      total_pay: pay,
      event_id: params.eventId,
      notes: a.notes || null,
    });

    totalHours += regularHours + overtimeHours;
    totalCost += pay;
  }

  // Determine pay period (default: week containing the event date)
  const eventDate = new Date(event.event_date);
  const dayOfWeek = eventDate.getDay();
  const periodStart = new Date(eventDate);
  periodStart.setDate(periodStart.getDate() - dayOfWeek); // Sunday
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 6); // Saturday

  // Save as draft
  const { data: export_, error } = await supabase
    .from("payroll_hours_exports")
    .insert({
      user_id: params.userId,
      organization_id: params.orgId,
      event_id: params.eventId,
      event_name: event.name,
      event_date: event.event_date,
      pay_period_start: periodStart.toISOString().split("T")[0],
      pay_period_end: periodEnd.toISOString().split("T")[0],
      status: "draft",
      line_items: lineItems,
      total_hours: totalHours,
      total_labor_cost: totalCost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return export_ as PayrollHoursExport;
}

/**
 * Approve and export hours to Gusto.
 * Sends hours to the appropriate Gusto payroll or creates contractor payments.
 */
export async function exportApprovedHours(params: {
  userId: string;
  orgId: string | null;
  exportId: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Get the export
  const { data: hoursExport } = await supabase
    .from("payroll_hours_exports")
    .select("*")
    .eq("id", params.exportId)
    .eq("user_id", params.userId)
    .single();

  if (!hoursExport) return { error: "Hours export not found" };
  if (hoursExport.status !== "approved") return { error: "Hours must be approved before exporting" };

  const gusto = await GustoClient.fromUser(params.userId, params.orgId);
  if (!gusto) return { error: "No active Gusto connection" };

  const lineItems = hoursExport.line_items as PayrollHoursLineItem[];
  const errors: string[] = [];

  for (const item of lineItems) {
    const mapping = await getPayrollId(params.userId, item.staff_member_id);
    if (!mapping) {
      errors.push(`${item.staff_name}: not mapped to a Gusto employee/contractor`);
      continue;
    }

    try {
      if (mapping.employeeType === "employee") {
        // Find the payroll for this pay period
        const payroll = await gusto.getUnprocessedPayroll(
          hoursExport.pay_period_start,
          hoursExport.pay_period_end
        );
        if (!payroll) {
          errors.push(`${item.staff_name}: no unprocessed payroll found for pay period`);
          continue;
        }

        // Update employee hours in the payroll
        const hours = [
          { name: "Regular Hours", hours: item.regular_hours.toString() },
        ];
        if (item.overtime_hours > 0) {
          hours.push({ name: "Overtime", hours: item.overtime_hours.toString() });
        }

        await gusto.updatePayrollEmployeeHours(
          payroll.payroll_uuid || payroll.uuid,
          mapping.payrollEmployeeId,
          hours
        );
      } else {
        // Contractor — create a contractor payment
        await gusto.createContractorPayment({
          contractorUuid: mapping.payrollEmployeeId,
          date: hoursExport.event_date,
          hourlyRate: item.hourly_rate,
          hours: item.regular_hours + item.overtime_hours,
        });
      }
    } catch (err) {
      errors.push(`${item.staff_name}: ${err instanceof Error ? err.message : "export failed"}`);
    }
  }

  // Update export status
  const status = errors.length === 0 ? "processed" : (errors.length < lineItems.length ? "processed" : "rejected");
  await supabase
    .from("payroll_hours_exports")
    .update({
      status,
      exported_to_gusto_at: new Date().toISOString(),
      notes: errors.length > 0 ? `Partial export. Errors: ${errors.join("; ")}` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportId);

  // Emit domain event
  await domainEvents.emit(
    "payroll.exported",
    {
      eventId: hoursExport.event_id,
      userId: params.userId,
      orgId: params.orgId,
      externalPayrollId: params.exportId,
      staffCount: lineItems.length - errors.length,
      totalHours: hoursExport.total_hours,
      totalLaborCost: hoursExport.total_labor_cost,
    },
    "payroll/hours-export"
  );

  if (errors.length > 0) {
    return { error: `Exported with ${errors.length} error(s): ${errors.join("; ")}` };
  }

  return { success: true };
}

/**
 * Approve hours export (changes status from draft to approved).
 */
export async function approveHoursExport(params: {
  userId: string;
  exportId: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("payroll_hours_exports")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: params.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportId)
    .eq("user_id", params.userId)
    .eq("status", "draft");

  if (error) return { error: error.message };

  // Emit domain event
  const { data: export_ } = await supabase
    .from("payroll_hours_exports")
    .select("event_id, line_items, total_labor_cost")
    .eq("id", params.exportId)
    .single();

  if (export_) {
    const items = export_.line_items as PayrollHoursLineItem[];
    await domainEvents.emit(
      "staffing.hours.approved",
      {
        eventId: export_.event_id,
        userId: params.userId,
        orgId: null,
        approvedHours: items.map((i) => ({
          staffMemberId: i.staff_member_id,
          staffName: i.staff_name,
          hours: i.regular_hours + i.overtime_hours,
          hourlyRate: i.hourly_rate,
        })),
        totalLaborCost: export_.total_labor_cost,
      },
      "payroll/hours-export"
    );
  }

  return { success: true };
}

// ─── Helpers ───

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
