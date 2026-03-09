// ── Polished HTML email templates for Cateros transactional emails ────────────
// Each function returns a complete HTML string with inline CSS.
// Table-based layout for maximum email client compatibility.

// ── Brand Colors (Dark Theme) ────────────────────────────────────────────────
const BG = "#0B1120";
const CARD = "#111827";
const ACCENT = "#D4A373";
const TEXT = "#F4F1ED";
const MUTED = "#7A8BA8";
const BORDER = "#1F2937";

// ── Layout helpers ───────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Logo Header -->
          <tr>
            <td style="padding:32px 40px;text-align:center;background-color:${CARD};border-bottom:2px solid ${ACCENT};border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:30px;font-weight:700;color:${ACCENT};letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">
                CATEROS
              </h1>
            </td>
          </tr>

          <!-- Body Card -->
          <tr>
            <td style="background-color:${CARD};padding:40px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${CARD};padding:24px 40px;border-top:1px solid ${BORDER};border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;font-size:13px;color:${MUTED};">
                Powered by <span style="color:${ACCENT};font-weight:600;">Cateros</span> &mdash; Catering management made simple.
              </p>
              <p style="margin:10px 0 0;font-size:12px;color:#4B5563;">
                <a href="{{unsubscribe_url}}" style="color:#4B5563;text-decoration:underline;">Unsubscribe</a> or manage your notification preferences in Settings.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:${TEXT};">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${MUTED};">${text}</p>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td align="center" style="background-color:${ACCENT};border-radius:8px;">
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:24pt">&nbsp;</i><![endif]-->
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:${BG};text-decoration:none;letter-spacing:0.3px;border-radius:8px;">
          ${label}
        </a>
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;" />`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px 8px 0;font-size:14px;color:${MUTED};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:${TEXT};font-weight:500;">${value}</td>
  </tr>`;
}

function detailTable(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;width:100%;background-color:${BG};border-radius:8px;padding:4px 16px;">
    ${rows.map((r) => detailRow(r.label, r.value)).join("")}
  </table>`;
}

function highlightBox(content: string): string {
  return `<div style="background-color:${BG};border-left:3px solid ${ACCENT};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;">
    ${content}
  </div>`;
}

// ── Template Functions ───────────────────────────────────────────────────────

/**
 * Payment received confirmation email.
 */
export function paymentReceived(data: {
  recipientName: string;
  amount: string;
  eventName: string;
  date?: string;
  paymentMethod?: string;
  eventUrl: string;
}): string {
  const rows: { label: string; value: string }[] = [
    { label: "Amount", value: `<span style="color:${ACCENT};font-weight:700;">${data.amount}</span>` },
    { label: "Event", value: data.eventName },
  ];
  if (data.date) rows.push({ label: "Date", value: data.date });
  if (data.paymentMethod) rows.push({ label: "Payment Method", value: data.paymentMethod });

  return layout(
    "Payment Received",
    `${heading("Payment Received")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`A payment of <strong style="color:${TEXT};">${data.amount}</strong> has been successfully received for <strong style="color:${TEXT};">${data.eventName}</strong>.`)}
     ${detailTable(rows)}
     ${divider()}
     ${paragraph("The payment has been recorded automatically. Check the event for a full payment history.")}
     ${ctaButton("View Event", data.eventUrl)}`
  );
}

/**
 * Payment reminder email.
 */
export function paymentReminder(data: {
  recipientName: string;
  amount: string;
  installmentName?: string;
  dueDate: string;
  eventName: string;
  paymentUrl: string;
}): string {
  const rows: { label: string; value: string }[] = [
    { label: "Amount Due", value: `<span style="color:${ACCENT};font-weight:700;">${data.amount}</span>` },
    { label: "Due Date", value: data.dueDate },
    { label: "Event", value: data.eventName },
  ];
  if (data.installmentName) rows.push({ label: "Installment", value: data.installmentName });

  return layout(
    "Payment Reminder",
    `${heading("Payment Reminder")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`This is a friendly reminder that a payment of <strong style="color:${TEXT};">${data.amount}</strong> is due on <strong style="color:${TEXT};">${data.dueDate}</strong> for <strong style="color:${TEXT};">${data.eventName}</strong>.`)}
     ${detailTable(rows)}
     ${divider()}
     ${paragraph("Please make your payment before the due date to keep everything on track.")}
     ${ctaButton("Make Payment", data.paymentUrl)}`
  );
}

/**
 * Proposal sent to client (client-facing email).
 */
export function proposalSent(data: {
  clientName: string;
  companyName: string;
  eventName: string;
  totalAmount?: string;
  proposalUrl: string;
}): string {
  const rows: { label: string; value: string }[] = [
    { label: "From", value: data.companyName },
    { label: "Event", value: data.eventName },
  ];
  if (data.totalAmount) rows.push({ label: "Total", value: `<span style="color:${ACCENT};font-weight:700;">${data.totalAmount}</span>` });

  return layout(
    `New Proposal from ${data.companyName}`,
    `${heading("You Have a New Proposal")}
     ${paragraph(`Hi ${data.clientName},`)}
     ${paragraph(`<strong style="color:${TEXT};">${data.companyName}</strong> has sent you a proposal for <strong style="color:${TEXT};">${data.eventName}</strong>. Review the details and let them know if you'd like to move forward.`)}
     ${detailTable(rows)}
     ${ctaButton("View Proposal", data.proposalUrl)}`
  );
}

/**
 * Proposal accepted notification (sent to caterer).
 */
export function proposalAccepted(data: {
  recipientName: string;
  clientName: string;
  eventName: string;
  eventUrl: string;
}): string {
  return layout(
    "Proposal Accepted",
    `${heading("Proposal Accepted!")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`Great news &mdash; <strong style="color:${TEXT};">${data.clientName}</strong> has accepted your proposal for <strong style="color:${TEXT};">${data.eventName}</strong>.`)}
     ${detailTable([
       { label: "Client", value: data.clientName },
       { label: "Event", value: data.eventName },
     ])}
     ${divider()}
     ${paragraph("Review the event details and take the next steps to confirm everything.")}
     ${ctaButton("View Event", data.eventUrl)}`
  );
}

/**
 * Proposal declined notification (sent to caterer).
 */
export function proposalDeclined(data: {
  recipientName: string;
  clientName: string;
  eventName: string;
  reason?: string;
  eventUrl: string;
}): string {
  const reasonBlock = data.reason
    ? `${divider()}${highlightBox(
        `<p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;">Client's Reason</p>
         <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">&ldquo;${data.reason}&rdquo;</p>`
      )}`
    : "";

  return layout(
    "Proposal Declined",
    `${heading("Proposal Declined")}
     ${paragraph(`Hi ${data.recipientName},`)}
     ${paragraph(`Unfortunately, <strong style="color:${TEXT};">${data.clientName}</strong> has declined your proposal for <strong style="color:${TEXT};">${data.eventName}</strong>.`)}
     ${detailTable([
       { label: "Client", value: data.clientName },
       { label: "Event", value: data.eventName },
     ])}
     ${reasonBlock}
     ${divider()}
     ${paragraph("You can review the details and consider following up or adjusting your offer.")}
     ${ctaButton("View Event", data.eventUrl)}`
  );
}

/**
 * Welcome email for new users.
 */
export function welcomeEmail(data: {
  userName: string;
  dashboardUrl: string;
}): string {
  return layout(
    "Welcome to Cateros",
    `${heading("Welcome to Cateros!")}
     ${paragraph(`Hi ${data.userName},`)}
     ${paragraph("Thanks for signing up. Cateros is built to help you manage events, create proposals, track payments, and grow your catering business &mdash; all in one place.")}
     ${divider()}
     ${paragraph("Here are a few things to get started:")}
     <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
       <tr>
         <td style="padding:10px 0;font-size:14px;color:${TEXT};">
           <span style="color:${ACCENT};font-weight:700;font-size:16px;">1.</span>&nbsp;&nbsp;Set up your business branding and logo
         </td>
       </tr>
       <tr>
         <td style="padding:10px 0;font-size:14px;color:${TEXT};">
           <span style="color:${ACCENT};font-weight:700;font-size:16px;">2.</span>&nbsp;&nbsp;Create your first event and build a proposal
         </td>
       </tr>
       <tr>
         <td style="padding:10px 0;font-size:14px;color:${TEXT};">
           <span style="color:${ACCENT};font-weight:700;font-size:16px;">3.</span>&nbsp;&nbsp;Add recipes to your menu library
         </td>
       </tr>
       <tr>
         <td style="padding:10px 0;font-size:14px;color:${TEXT};">
           <span style="color:${ACCENT};font-weight:700;font-size:16px;">4.</span>&nbsp;&nbsp;Invite your team and assign roles
         </td>
       </tr>
     </table>
     ${ctaButton("Go to Dashboard", data.dashboardUrl)}`
  );
}

/**
 * Team invite email.
 */
export function teamInvite(data: {
  recipientName?: string;
  orgName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}): string {
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : "Hi there,";

  return layout(
    `You're Invited to ${data.orgName}`,
    `${heading("You're Invited!")}
     ${paragraph(greeting)}
     ${paragraph(`<strong style="color:${TEXT};">${data.inviterName}</strong> has invited you to join <strong style="color:${TEXT};">${data.orgName}</strong> on Cateros.`)}
     ${detailTable([
       { label: "Organization", value: data.orgName },
       { label: "Invited By", value: data.inviterName },
       { label: "Role", value: `<span style="color:${ACCENT};">${data.role}</span>` },
     ])}
     ${divider()}
     ${paragraph("Click the button below to accept the invitation and get started.")}
     ${ctaButton("Accept Invite", data.inviteUrl)}`
  );
}
