import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import type { ActivityType } from "@/lib/activity";

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
    .select("id, title, status, event_id, user_id, client_messages")
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
    // Fetch event name for notification messages
    const { data: eventData } = await supabase
      .from("events")
      .select("name")
      .eq("id", proposal.event_id)
      .single();

    const eventName = eventData?.name || "Untitled Event";
    const eventStatus = action === "accepted" ? "confirmed" : "canceled";

    await supabase
      .from("events")
      .update({ status: eventStatus, updated_at: new Date().toISOString() })
      .eq("id", proposal.event_id);

    // Notify user about the auto-conversion
    if (proposal.user_id) {
      const autoMessage =
        action === "accepted"
          ? `Event '${eventName}' has been automatically confirmed after proposal approval`
          : `Client declined proposal for '${eventName}'`;

      await createNotification({
        userId: proposal.user_id,
        type: action === "accepted" ? "proposal_accepted" : "proposal_declined",
        title: action === "accepted" ? "Event Auto-Confirmed" : "Event Canceled",
        message: autoMessage,
        linkUrl: `/events/${proposal.event_id}`,
      });
    }

    // Log activity on the event
    const activityType: ActivityType = "status_change";
    const activityDesc =
      action === "accepted"
        ? `Event auto-confirmed after client accepted proposal "${proposal.title}"`
        : `Event canceled after client declined proposal "${proposal.title}"`;

    await supabase.from("event_activity").insert({
      event_id: proposal.event_id,
      user_id: proposal.user_id,
      type: activityType,
      description: activityDesc,
      metadata: {
        proposal_id: proposal.id,
        proposal_title: proposal.title,
        client_action: action,
        auto_converted: true,
      },
    });
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
