import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ── Resend client (lazy-initialized) ──────────────────────────────────────────
let resendClient: Resend | null = null;
let resendKeyWarned = false;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    if (!resendKeyWarned) {
      resendKeyWarned = true;
      console.warn("[email] RESEND_API_KEY is not set — email sending is disabled.");
    }
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "notifications@cateros.app";
const FROM_NAME = "Cateros";

// ── Branding constants ────────────────────────────────────────────────────────
const NAVY = "#0C1220";
const GOLD = "#D4A373";
const CREAM = "#F4F1ED";
const DARK_TEXT = "#1A1A2E";
const MUTED_TEXT = "#6B7280";
const WHITE = "#FFFFFF";

// ── Base email wrapper ────────────────────────────────────────────────────────
function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${NAVY};padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:${GOLD};letter-spacing:1px;">
                CATEROS
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:${WHITE};padding:40px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${NAVY};padding:24px 40px;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9CA3AF;">
                Sent by Cateros &mdash; Catering business management made simple.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#6B7280;">
                You received this email because you have notifications enabled in your Cateros settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:${DARK_TEXT};">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED_TEXT};">${text}</p>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${GOLD};border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:${NAVY};text-decoration:none;letter-spacing:0.3px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${MUTED_TEXT};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:${DARK_TEXT};font-weight:500;">${value}</td>
  </tr>`;
}

function detailTable(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${rows.map((r) => detailRow(r.label, r.value)).join("")}
  </table>`;
}

// ── Email template functions ──────────────────────────────────────────────────

export function proposalViewedEmail(data: {
  recipientName: string;
  proposalTitle: string;
  clientName: string;
  eventUrl: string;
}): string {
  return emailLayout(
    "Proposal Viewed",
    `${heading("Your Proposal Was Viewed")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`Great news &mdash; <strong>${data.clientName}</strong> has just viewed your proposal.`)}
     ${detailTable([{ label: "Proposal", value: data.proposalTitle }])}
     ${paragraph("Now is a good time to follow up while the proposal is top of mind.")}
     ${ctaButton("View Event Details", data.eventUrl)}`
  );
}

export function proposalApprovedEmail(data: {
  recipientName: string;
  proposalTitle: string;
  clientName: string;
  eventUrl: string;
}): string {
  return emailLayout(
    "Proposal Approved",
    `${heading("Proposal Approved!")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`<strong>${data.clientName}</strong> has approved your proposal. Congratulations!`)}
     ${detailTable([{ label: "Proposal", value: data.proposalTitle }])}
     ${paragraph("Review the event details and take the next steps to move things forward.")}
     ${ctaButton("View Event Details", data.eventUrl)}`
  );
}

export function proposalSignedEmail(data: {
  recipientName: string;
  proposalTitle: string;
  clientName: string;
  signerName: string;
  eventUrl: string;
}): string {
  return emailLayout(
    "Contract Signed",
    `${heading("Contract Has Been Signed")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`The contract for your proposal has been signed. You're one step closer to a confirmed event.`)}
     ${detailTable([
       { label: "Proposal", value: data.proposalTitle },
       { label: "Signed By", value: data.signerName },
       { label: "Client", value: data.clientName },
     ])}
     ${divider()}
     ${paragraph("Check the event for any remaining steps such as deposit collection.")}
     ${ctaButton("View Event Details", data.eventUrl)}`
  );
}

export function proposalDeclinedEmail(data: {
  recipientName: string;
  proposalTitle: string;
  clientName: string;
  message?: string;
  eventUrl: string;
}): string {
  const messageBlock = data.message
    ? `${divider()}
       <div style="background-color:${CREAM};border-left:3px solid ${GOLD};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;">
         <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${MUTED_TEXT};text-transform:uppercase;letter-spacing:0.5px;">Client Message</p>
         <p style="margin:0;font-size:14px;color:${DARK_TEXT};line-height:1.5;">&ldquo;${data.message}&rdquo;</p>
       </div>`
    : "";

  return emailLayout(
    "Proposal Declined",
    `${heading("Proposal Declined")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`Unfortunately, <strong>${data.clientName}</strong> has declined your proposal.`)}
     ${detailTable([{ label: "Proposal", value: data.proposalTitle }])}
     ${messageBlock}
     ${paragraph("You can review the details and consider following up or adjusting your offer.")}
     ${ctaButton("View Event Details", data.eventUrl)}`
  );
}

export function paymentReceivedEmail(data: {
  recipientName: string;
  amount: string;
  eventName: string;
  eventUrl: string;
}): string {
  return emailLayout(
    "Payment Received",
    `${heading("Payment Received")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`A payment has been successfully processed for one of your events.`)}
     ${detailTable([
       { label: "Amount", value: data.amount },
       { label: "Event", value: data.eventName },
     ])}
     ${divider()}
     ${paragraph("The payment has been recorded automatically. Check the event for a full payment history.")}
     ${ctaButton("View Event Details", data.eventUrl)}`
  );
}

export function welcomeEmail(data: {
  userName: string;
  loginUrl: string;
}): string {
  return emailLayout(
    "Welcome to Cateros",
    `${heading("Welcome to Cateros!")}
     ${paragraph(`Hi ${data.userName},`)}
     ${paragraph("Thank you for joining Cateros. We're excited to help you manage your catering business more efficiently.")}
     ${divider()}
     ${paragraph("Here's what you can do to get started:")}
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
       <tr>
         <td style="padding:8px 0;font-size:14px;color:${DARK_TEXT};">
           <strong style="color:${GOLD};">1.</strong>&nbsp; Set up your business branding and logo
         </td>
       </tr>
       <tr>
         <td style="padding:8px 0;font-size:14px;color:${DARK_TEXT};">
           <strong style="color:${GOLD};">2.</strong>&nbsp; Create your first event and build a proposal
         </td>
       </tr>
       <tr>
         <td style="padding:8px 0;font-size:14px;color:${DARK_TEXT};">
           <strong style="color:${GOLD};">3.</strong>&nbsp; Add recipes to your menu library
         </td>
       </tr>
       <tr>
         <td style="padding:8px 0;font-size:14px;color:${DARK_TEXT};">
           <strong style="color:${GOLD};">4.</strong>&nbsp; Explore your dashboard for insights
         </td>
       </tr>
     </table>
     ${ctaButton("Go to Your Dashboard", data.loginUrl)}`
  );
}

// ── Send email function ───────────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "Email sending is not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email] Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Unexpected error sending email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ── Helper to look up user email & notification preferences ───────────────────

/**
 * Returns the user's email and notification preferences, or null if email
 * notifications are disabled or user not found.
 */
export async function getUserEmailPrefs(userId: string): Promise<{
  email: string;
  fullName: string;
  notificationEmail: boolean;
  notificationProposals: boolean;
  notificationPayments: boolean;
} | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch user profile for email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return null;

  // Fetch notification preferences from business_settings
  const { data: settings } = await supabase
    .from("business_settings")
    .select("notification_email, notification_proposals, notification_payments")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    email: profile.email,
    fullName: profile.full_name || "there",
    notificationEmail: settings?.notification_email ?? true,
    notificationProposals: settings?.notification_proposals ?? true,
    notificationPayments: settings?.notification_payments ?? true,
  };
}

/**
 * Non-blocking fire-and-forget email send. Logs errors but never throws.
 */
export function sendEmailAsync(params: {
  to: string;
  subject: string;
  html: string;
}): void {
  sendEmail(params).catch((err) => {
    console.error("[email] Async email send failed:", err);
  });
}
