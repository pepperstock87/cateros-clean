import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { disconnect } from "@/lib/quickbooks/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const org = await getCurrentOrg();
    await disconnect(user.id, org?.orgId || null);

    logAudit({
      userId: user.id,
      action: "delete",
      entity: "payment",
      entityId: "quickbooks",
      entityName: "QuickBooks disconnected",
      details: { integration: "quickbooks", action: "disconnected" },
      organizationId: org?.orgId || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to disconnect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
