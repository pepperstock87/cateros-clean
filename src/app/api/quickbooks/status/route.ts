import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getConnection } from "@/lib/quickbooks/auth";
import { getRecentSyncLogs } from "@/lib/quickbooks/queue";

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
      companyName: null,
      lastSynced: null,
      recentLogs: [],
    });
  }

  const recentLogs = await getRecentSyncLogs({
    userId: user.id,
    orgId: org?.orgId || null,
    limit: 20,
  });

  return NextResponse.json({
    connected: true,
    companyName: connection.company_name,
    realmId: connection.realm_id,
    lastSynced: connection.last_synced_at,
    recentLogs,
  });
}
