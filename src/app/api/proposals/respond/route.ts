import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { share_token, action } = await req.json();

  if (!share_token || !["accepted", "declined"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Use service role to bypass RLS — this is a public endpoint
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find proposal by share token
  const { data: proposal, error: findError } = await supabase
    .from("proposals")
    .select("id, status, event_id, user_id")
    .eq("share_token", share_token)
    .single();

  if (findError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status === "accepted" || proposal.status === "declined") {
    return NextResponse.json({ error: "Proposal has already been responded to" }, { status: 400 });
  }

  // Update proposal status
  const { error: updateError } = await supabase
    .from("proposals")
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq("id", proposal.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }

  // Auto-update linked event status
  if (proposal.event_id) {
    const eventStatus = action === "accepted" ? "confirmed" : "canceled";
    await supabase
      .from("events")
      .update({ status: eventStatus, updated_at: new Date().toISOString() })
      .eq("id", proposal.event_id);
  }

  return NextResponse.json({ success: true, status: action });
}
