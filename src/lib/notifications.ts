// Notification helper — stores in-app notifications and sends email when enabled

import { createClient } from "@supabase/supabase-js";
import {
  getUserEmailPrefs,
  sendEmailAsync,
  proposalViewedEmail,
  proposalApprovedEmail,
  proposalSignedEmail,
  proposalDeclinedEmail,
  paymentReceivedEmail,
} from "@/lib/email";

type NotificationType =
  | "proposal_accepted"
  | "proposal_declined"
  | "proposal_viewed"
  | "proposal_approved"
  | "proposal_signed"
  | "proposal_booked"
  | "revision_requested"
  | "payment_received";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  /** Extra data used for richer email templates. Optional — falls back to plain notification message. */
  emailData?: {
    proposalTitle?: string;
    clientName?: string;
    signerName?: string;
    amount?: string;
    eventName?: string;
    eventUrl?: string;
  };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Always store the in-app notification
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link_url: params.linkUrl,
    read: false,
  });

  // 2. Fire-and-forget email if the user has email notifications enabled
  try {
    const prefs = await getUserEmailPrefs(params.userId);
    if (!prefs || !prefs.notificationEmail) return;

    // Check category-specific preferences
    const isProposalType = [
      "proposal_accepted",
      "proposal_declined",
      "proposal_viewed",
      "proposal_approved",
      "proposal_signed",
      "proposal_booked",
      "revision_requested",
    ].includes(params.type);
    const isPaymentType = params.type === "payment_received";

    if (isProposalType && !prefs.notificationProposals) return;
    if (isPaymentType && !prefs.notificationPayments) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventUrl = params.emailData?.eventUrl
      ? `${appUrl}${params.emailData.eventUrl}`
      : params.linkUrl
        ? `${appUrl}${params.linkUrl}`
        : `${appUrl}/dashboard`;

    const ed = params.emailData || {};
    const recipientName = prefs.fullName;

    let subject = params.title;
    let html: string | null = null;

    switch (params.type) {
      case "proposal_viewed":
        subject = `Proposal Viewed: ${ed.proposalTitle || "Your Proposal"}`;
        html = proposalViewedEmail({
          recipientName,
          proposalTitle: ed.proposalTitle || "Your Proposal",
          clientName: ed.clientName || "A client",
          eventUrl,
        });
        break;

      case "proposal_approved":
        subject = `Proposal Approved: ${ed.proposalTitle || "Your Proposal"}`;
        html = proposalApprovedEmail({
          recipientName,
          proposalTitle: ed.proposalTitle || "Your Proposal",
          clientName: ed.clientName || "A client",
          eventUrl,
        });
        break;

      case "proposal_signed":
        subject = `Contract Signed: ${ed.proposalTitle || "Your Proposal"}`;
        html = proposalSignedEmail({
          recipientName,
          proposalTitle: ed.proposalTitle || "Your Proposal",
          clientName: ed.clientName || "A client",
          signerName: ed.signerName || "The client",
          eventUrl,
        });
        break;

      case "proposal_declined":
        subject = `Proposal Declined: ${ed.proposalTitle || "Your Proposal"}`;
        html = proposalDeclinedEmail({
          recipientName,
          proposalTitle: ed.proposalTitle || "Your Proposal",
          clientName: ed.clientName || "A client",
          message: params.message.startsWith("Client responded:")
            ? params.message.replace(/^Client responded:\s*"?|"$/g, "")
            : undefined,
          eventUrl,
        });
        break;

      case "proposal_booked":
        subject = `Event Confirmed: ${ed.eventName || "Your Event"}`;
        html = proposalApprovedEmail({
          recipientName,
          proposalTitle: ed.proposalTitle || "Your Proposal",
          clientName: ed.clientName || "A client",
          eventUrl,
        });
        break;

      case "payment_received":
        subject = `Payment Received: ${ed.amount || ""}`;
        html = paymentReceivedEmail({
          recipientName,
          amount: ed.amount || "$0.00",
          eventName: ed.eventName || "Your Event",
          eventUrl,
        });
        break;

      default:
        // For types without a rich template, skip email
        return;
    }

    if (html) {
      sendEmailAsync({
        to: prefs.email,
        subject,
        html,
      });
    }
  } catch (err) {
    // Never let email failures affect the core notification flow
    console.error("[notifications] Email send error (non-blocking):", err);
  }
}
