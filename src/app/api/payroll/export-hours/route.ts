import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import {
  collectEventHours,
  approveHoursExport,
  exportApprovedHours,
} from "@/lib/payroll/hours-export";
import { registerDomainEventHandlers } from "@/lib/events";

registerDomainEventHandlers();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, eventId, exportId } = body as {
    action: "collect" | "approve" | "export";
    eventId?: string;
    exportId?: string;
  };

  const org = await getCurrentOrg();

  try {
    switch (action) {
      case "collect": {
        if (!eventId) {
          return NextResponse.json({ error: "eventId is required" }, { status: 400 });
        }
        const result = await collectEventHours({
          userId: user.id,
          orgId: org?.orgId || null,
          eventId,
        });
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, export: result });
      }

      case "approve": {
        if (!exportId) {
          return NextResponse.json({ error: "exportId is required" }, { status: 400 });
        }
        const result = await approveHoursExport({
          userId: user.id,
          exportId,
        });
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      case "export": {
        if (!exportId) {
          return NextResponse.json({ error: "exportId is required" }, { status: 400 });
        }
        const result = await exportApprovedHours({
          userId: user.id,
          orgId: org?.orgId || null,
          exportId,
        });
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
