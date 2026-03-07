import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
