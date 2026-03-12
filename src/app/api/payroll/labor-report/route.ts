import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getEventLaborReport, getMultiEventLaborReport } from "@/lib/payroll/labor-report";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const org = await getCurrentOrg();

  try {
    if (eventId) {
      // Single event report
      const report = await getEventLaborReport({
        userId: user.id,
        orgId: org?.orgId || null,
        eventId,
      });
      if ("error" in report) {
        return NextResponse.json({ error: report.error }, { status: 404 });
      }
      return NextResponse.json(report);
    } else {
      // Multi-event summary
      const report = await getMultiEventLaborReport({
        userId: user.id,
        orgId: org?.orgId || null,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return NextResponse.json(report);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
