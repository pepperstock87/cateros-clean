import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const { share_token, action, message } = await req.json();

  if (!share_token || !["accepted", "declined", "revision_requested"].includes(action)) {
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
    .select("id, status, event_id, user_id, client_messages")
    .eq("share_token", share_token)
    .single();

  if (findError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status === "accepted" || proposal.status === "declined") {
    return NextResponse.json({ error: "Proposal has already been responded to" }, { status: 400 });
  }

  // Build client message entry
  const clientMessages = Array.isArray(proposal.client_messages) ? proposal.client_messages : [];
  if (message?.trim()) {
    clientMessages.push({
      id: crypto.randomUUID(),
      from: "client",
      message: message.trim(),
      action,
      created_at: new Date().toISOString(),
    });
  }

  // Determine new proposal status
  const newStatus = action === "revision_requested" ? "sent" : action;

  // Update proposal
  const { error: updateError } = await supabase
    .from("proposals")
    .update({
      status: newStatus,
      client_messages: clientMessages,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }

  // Auto-update linked event status for accept/decline
  if (proposal.event_id && action !== "revision_requested") {
    const eventStatus = action === "accepted" ? "confirmed" : "canceled";
    await supabase
      .from("events")
      .update({ status: eventStatus, updated_at: new Date().toISOString() })
      .eq("id", proposal.event_id);
  }

  // Send notification to the caterer
  const notificationMap: Record<string, { type: "proposal_accepted" | "proposal_declined" | "revision_requested"; title: string }> = {
    accepted: { type: "proposal_accepted", title: "Proposal Accepted" },
    declined: { type: "proposal_declined", title: "Proposal Declined" },
    revision_requested: { type: "revision_requested", title: "Revision Requested" },
  };

  const notif = notificationMap[action];
  if (notif && proposal.user_id) {
    const linkUrl = proposal.event_id
      ? `/events/${proposal.event_id}`
      : `/proposals`;

    await createNotification({
      userId: proposal.user_id,
      type: notif.type,
      title: notif.title,
      message: message?.trim()
        ? `Client responded: "${message.trim()}"`
        : `A client has ${action.replace("_", " ")} your proposal.`,
      linkUrl,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
