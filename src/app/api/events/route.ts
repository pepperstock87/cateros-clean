import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name: body.name,
      client_name: body.client_name || "TBD",
      client_email: body.client_email || null,
      event_date: body.event_date,
      guest_count: body.guest_count || 100,
      venue: body.venue || null,
      notes: body.notes || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
