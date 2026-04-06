import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`portal-vendors:${ip}`, { limit: 30, windowMs: 60_000 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  const shareToken = req.nextUrl.searchParams.get("shareToken");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // Validate UUID format to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ error: "Invalid eventId format" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the caller has access via a valid share token for this event
  if (shareToken) {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("share_token", shareToken)
      .eq("event_id", eventId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else {
    // No share token — this is a public-facing endpoint that should require one
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: vendors, error } = await supabase
    .from("event_organizations")
    .select("*, organization:organizations(*)")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("is_primary", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }

  return NextResponse.json({ vendors: vendors ?? [] });
}
