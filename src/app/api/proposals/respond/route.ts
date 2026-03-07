import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import type { ActivityType } from "@/lib/activity";

const VALID_ACTIONS = ["viewed", "approved", "signed", "declined", "revision_requested"];

/**
 * Determine the effective next status based on the client action and booking config.
 * Handles auto-advance logic for the booking workflow:
 *   draft -> sent -> viewed -> approved -> signed -> deposit_paid -> booked
 */
function determineNextStatus(
  action: string,
  bookingConfig: { require_contract?: boolean; require_deposit?: boolean } | null,
  hasDepositPaid: boolean
): string {
  const config = bookingConfig || {};

  if (action === "approved") {
    if (config.require_contract) return "approved";
    if (config.require_deposit && !hasDepositPaid) return "approved";
    return "booked";
  }

  if (action === "signed") {
    if (config.require_deposit && !hasDepositPaid) return "signed";
    return "booked";
  }

  if (action === "declined") return "declined";
  if (action === "viewed") return "viewed";
  if (action === "revision_requested") return "sent";

  return action;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { share_token, action, message, signer_name, signer_email } = body;

  if (!share_token || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Validate signed action requires signer_name
  if (action === "signed" && !signer_name?.trim()) {
    return NextResponse.json({ error: "Signer name is required" }, { status: 400 });
  }

  // Capture client IP address
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

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

  // Prevent actions on terminal states
  if (["booked", "declined", "expired"].includes(proposal.status)) {
    return NextResponse.json({ error: "Proposal has already been finalized" }, { status: 400 });
  }

  // ── Handle "viewed" action ──
  if (action === "viewed") {
    // Set viewed_at only if not already set
    await supabase
      .from("proposals")
      .update({
        viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(proposal.status === "sent" ? { status: "viewed" } : {}),
      })
      .eq("id", proposal.id)
      .is("viewed_at", null);

    // If viewed_at was already set but status is still "sent", still transition status
    if (proposal.status === "sent") {
      await supabase
        .from("proposals")
        .update({ status: "viewed", updated_at: new Date().toISOString() })
        .eq("id", proposal.id)
        .eq("status", "sent");
    }

    // Notify caterer that client viewed the proposal
    if (proposal.user_id && proposal.status === "sent") {
      await createNotification({
        userId: proposal.user_id,
        type: "proposal_viewed",
        title: "Proposal Viewed",
        message: `A client has viewed your proposal "${proposal.title}".`,
        linkUrl: proposal.event_id ? `/events/${proposal.event_id}` : `/proposals`,
      });
    }

    return NextResponse.json({
      success: true,
      status: proposal.status === "sent" ? "viewed" : proposal.status,
    });
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

  // ── Fetch event data and booking_config for auto-advance decisions ──
  let bookingConfig: { require_contract?: boolean; require_deposit?: boolean } | null = null;
  let eventName = "Untitled Event";

  if (proposal.event_id) {
    const { data: eventData } = await supabase
      .from("events")
      .select("name, booking_config")
      .eq("id", proposal.event_id)
      .single();

    if (eventData) {
      eventName = eventData.name || "Untitled Event";
      bookingConfig = (eventData.booking_config as typeof bookingConfig) || null;
    }
  }

  // Determine the new status with auto-advance logic
  const newStatus = determineNextStatus(action, bookingConfig, false);

  // Update proposal status
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

  // ── Handle "signed" action — record contract acceptance ──
  if (action === "signed") {
    await supabase.from("contract_acceptances").insert({
      proposal_id: proposal.id,
      event_id: proposal.event_id,
      user_id: proposal.user_id,
      signer_name: signer_name.trim(),
      signer_email: signer_email?.trim() || null,
      ip_address: clientIp,
      accepted_at: new Date().toISOString(),
    });
  }

  // ── Auto-update linked event when status becomes "booked" or "declined" ──
  if (proposal.event_id && (newStatus === "booked" || action === "declined")) {
    const eventStatus = newStatus === "booked" ? "confirmed" : "canceled";

    await supabase
      .from("events")
      .update({ status: eventStatus, updated_at: new Date().toISOString() })
      .eq("id", proposal.event_id);

    // Notify user about the auto-conversion
    if (proposal.user_id) {
      const autoMessage =
        newStatus === "booked"
          ? `Event '${eventName}' has been automatically confirmed after proposal was booked`
          : `Client declined proposal for '${eventName}'`;

      await createNotification({
        userId: proposal.user_id,
        type: newStatus === "booked" ? "proposal_booked" : "proposal_declined",
        title: newStatus === "booked" ? "Event Auto-Confirmed" : "Event Canceled",
        message: autoMessage,
        linkUrl: `/events/${proposal.event_id}`,
      });
    }

    // Log activity on the event
    const activityType: ActivityType = "status_change";
    const activityDesc =
      newStatus === "booked"
        ? `Event auto-confirmed after client completed booking workflow for proposal "${proposal.title}"`
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
        resolved_status: newStatus,
        auto_converted: true,
      },
    });
  }

  // ── Send notification to the caterer for non-event-linked actions or intermediate states ──
  if (!(newStatus === "booked" && proposal.event_id) && !(action === "declined" && proposal.event_id)) {
    const notificationMap: Record<
      string,
      { type: "proposal_approved" | "proposal_signed" | "proposal_declined" | "revision_requested"; title: string }
    > = {
      approved: { type: "proposal_approved", title: "Proposal Approved" },
      signed: { type: "proposal_signed", title: "Contract Signed" },
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
          : `A client has ${action.replace("_", " ")} your proposal "${proposal.title}".`,
        linkUrl,
      });
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}
