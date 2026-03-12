// Employee/Contractor Mapping
//
// Maps Cateros staff_members to Gusto employees/contractors.
// Users configure this mapping in the settings UI after connecting Gusto.

import { createClient } from "@/lib/supabase/server";
import type { PayrollEmployeeMapping } from "./types";

/**
 * Get the Gusto employee/contractor ID for a Cateros staff member.
 */
export async function getPayrollId(
  userId: string,
  staffMemberId: string
): Promise<{ payrollEmployeeId: string; employeeType: "employee" | "contractor" } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_employee_mappings")
    .select("payroll_employee_id, employee_type")
    .eq("user_id", userId)
    .eq("staff_member_id", staffMemberId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    payrollEmployeeId: data.payroll_employee_id,
    employeeType: data.employee_type,
  };
}

/**
 * Get all active employee mappings for a user.
 */
export async function getAllMappings(
  userId: string,
  orgId: string | null
): Promise<PayrollEmployeeMapping[]> {
  const supabase = await createClient();
  let q = supabase
    .from("payroll_employee_mappings")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (orgId) q = q.eq("organization_id", orgId);

  const { data } = await q;
  return (data ?? []) as PayrollEmployeeMapping[];
}

/**
 * Create or update an employee mapping.
 */
export async function upsertMapping(params: {
  userId: string;
  orgId: string | null;
  staffMemberId: string;
  payrollEmployeeId: string;
  employeeType: "employee" | "contractor";
  employeeName: string;
  hourlyRateOverride?: number;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("payroll_employee_mappings").upsert(
    {
      user_id: params.userId,
      organization_id: params.orgId,
      staff_member_id: params.staffMemberId,
      payroll_employee_id: params.payrollEmployeeId,
      employee_type: params.employeeType,
      employee_name: params.employeeName,
      hourly_rate_override: params.hourlyRateOverride ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,staff_member_id" }
  );
}

/**
 * Remove a mapping.
 */
export async function removeMapping(
  userId: string,
  staffMemberId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("payroll_employee_mappings")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("staff_member_id", staffMemberId);
}
