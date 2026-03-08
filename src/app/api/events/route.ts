import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Validate required fields
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Event name is required and must be a non-empty string" }, { status: 400 });
  }

  // Validate guest_count if provided
  if (body.guest_count != null) {
    const guestCount = Number(body.guest_count);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return NextResponse.json({ error: "guest_count must be a positive integer" }, { status: 400 });
    }
  }

  if (body.guest_count == null) {
    return NextResponse.json({ error: "guest_count is required and must be a positive integer" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      client_name: body.client_name || "TBD",
      client_email: body.client_email || null,
      event_date: body.event_date,
      guest_count: body.guest_count,
      venue: body.venue || null,
      notes: body.notes || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create event. Please check your input and try again." }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
