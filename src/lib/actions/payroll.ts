"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getConnection } from "@/lib/payroll/auth";
import { getAllMappings } from "@/lib/payroll/mapping";

export interface PayrollStatusData {
  connected: boolean;
  provider: string | null;
  companyName: string | null;
  lastSynced: string | null;
  mappedEmployees: number;
  mappings: Array<{
    staffMemberId: string;
    employeeName: string;
    employeeType: "employee" | "contractor";
    isActive: boolean;
  }>;
  pendingExports: number;
  processedExports: number;
}

export async function getPayrollStatus(): Promise<PayrollStatusData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { connected: false, provider: null, companyName: null, lastSynced: null, mappedEmployees: 0, mappings: [], pendingExports: 0, processedExports: 0 };
  }

  const org = await getCurrentOrg();
  const orgId = org?.orgId || null;
  const connection = await getConnection(user.id, orgId);

  if (!connection) {
    return { connected: false, provider: null, companyName: null, lastSynced: null, mappedEmployees: 0, mappings: [], pendingExports: 0, processedExports: 0 };
  }

  const [mappings, pendingRes, processedRes] = await Promise.all([
    getAllMappings(user.id, orgId),
    supabase
      .from("payroll_hours_exports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["draft", "approved"]),
    supabase
      .from("payroll_hours_exports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "processed"),
  ]);

  return {
    connected: true,
    provider: connection.provider,
    companyName: connection.company_name,
    lastSynced: connection.last_synced_at,
    mappedEmployees: mappings.filter((m) => m.is_active).length,
    mappings: mappings.map((m) => ({
      staffMemberId: m.staff_member_id,
      employeeName: m.employee_name,
      employeeType: m.employee_type,
      isActive: m.is_active,
    })),
    pendingExports: pendingRes.count ?? 0,
    processedExports: processedRes.count ?? 0,
  };
}
