import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { processRetryQueue, getRecentSyncJobs } from "@/lib/distributors/sync";
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
  const { action, distributorId } = body as {
    action: "process_retries" | "get_jobs";
    distributorId?: string;
  };

  const org = await getCurrentOrg();

  try {
    switch (action) {
      case "process_retries": {
        const processed = await processRetryQueue();
        return NextResponse.json({ success: true, processed });
      }

      case "get_jobs": {
        const jobs = await getRecentSyncJobs({
          userId: user.id,
          orgId: org?.orgId || null,
          distributorId,
          limit: 50,
        });
        return NextResponse.json({ jobs });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
