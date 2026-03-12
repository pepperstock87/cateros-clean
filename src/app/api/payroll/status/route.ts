import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getConnection } from "@/lib/payroll/auth";
import { getAllMappings } from "@/lib/payroll/mapping";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getCurrentOrg();
  const connection = await getConnection(user.id, org?.orgId || null);

  if (!connection) {
    return NextResponse.json({
      connected: false,
      provider: null,
      companyName: null,
      mappedEmployees: 0,
    });
  }

  const mappings = await getAllMappings(user.id, org?.orgId || null);

  return NextResponse.json({
    connected: true,
    provider: connection.provider,
    companyName: connection.company_name,
    companyUuid: connection.company_uuid,
    lastSynced: connection.last_synced_at,
    mappedEmployees: mappings.length,
    mappings: mappings.map((m) => ({
      staffMemberId: m.staff_member_id,
      employeeName: m.employee_name,
      employeeType: m.employee_type,
      isActive: m.is_active,
    })),
  });
}
