/**
 * Email Templates
 * Professional HTML email templates for CAIN
 */

const brandGold = "#D4A373";
const darkBg = "#1a1a2e";
const textColor = "#ffffff";
const lightGray = "#f5f5f5";

interface TemplateResult {
  subject: string;
  html: string;
}

/**
 * Header component for all emails
 */
function emailHeader(companyName: string): string {
  return `
    <div style="background-color: ${darkBg}; padding: 30px 20px; text-align: center; border-bottom: 3px solid ${brandGold};">
      <h1 style="color: ${brandGold}; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">
        ${companyName || "C.A.I.N."}
      </h1>
      <p style="color: ${textColor}; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
        Catering AI Navigator
      </p>
    </div>
  `;
}

/**
 * Footer component for all emails
 */
function emailFooter(): string {
  return `
    <div style="background-color: ${lightGray}; padding: 20px; text-align: center; border-top: 1px solid #ddd; margin-top: 30px;">
      <p style="color: #666; margin: 0; font-size: 12px;">
        Powered by <strong>Cateros</strong> — Catering Business Management Platform
      </p>
      <p style="color: #999; margin: 8px 0 0 0; font-size: 11px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * CTA Button component
 */
function ctaButton(text: string, url?: string): string {
  return `
    <a href="${url || '#'}" style="display: inline-block; background-color: ${brandGold}; color: ${darkBg}; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px; margin: 15px 0;">
      ${text}
    </a>
  `;
}

/**
 * Proposal Email Template
 */
export function proposalEmailTemplate(params: {
  clientName: string;
  eventName: string;
  eventDate: string;
  suggestedPrice: number;
  companyName: string;
  proposalUrl?: string;
}): TemplateResult {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(params.suggestedPrice);

  return {
    subject: `Your Event Proposal: ${params.eventName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${emailHeader(params.companyName)}

            <div style="padding: 30px 20px;">
              <p style="color: ${darkBg}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${params.clientName}</strong>,
              </p>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for considering us for your upcoming event. We're excited to help make <strong>${params.eventName}</strong> a memorable occasion!
              </p>

              <div style="background-color: ${lightGray}; padding: 20px; border-left: 4px solid ${brandGold}; margin: 20px 0;">
                <p style="color: ${darkBg}; margin: 0 0 10px 0; font-size: 14px;">
                  <strong>Event Details:</strong>
                </p>
                <p style="color: ${darkBg}; margin: 5px 0; font-size: 14px;">
                  📅 <strong>Date:</strong> ${params.eventDate}
                </p>
                <p style="color: ${darkBg}; margin: 5px 0; font-size: 14px;">
                  💰 <strong>Suggested Price:</strong> ${formattedPrice}
                </p>
              </div>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                Your complete proposal includes catering menu recommendations, staffing plan, timeline, and detailed pricing.
              </p>

              <div style="text-align: center;">
                ${ctaButton("View Full Proposal", params.proposalUrl)}
              </div>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or would like to discuss custom options, we're here to help!
              </p>
            </div>

            ${emailFooter()}
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Invoice Email Template
 */
export function invoiceEmailTemplate(params: {
  clientName: string;
  eventName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  companyName: string;
  paymentUrl?: string;
}): TemplateResult {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(params.amount);

  return {
    subject: `Invoice ${params.invoiceNumber}: ${params.eventName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${emailHeader(params.companyName)}

            <div style="padding: 30px 20px;">
              <p style="color: ${darkBg}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${params.clientName}</strong>,
              </p>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                Your invoice for <strong>${params.eventName}</strong> is now ready for payment.
              </p>

              <div style="background-color: ${darkBg}; color: ${textColor}; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <span style="font-size: 12px; opacity: 0.8;">Invoice Number</span>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">${params.invoiceNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <span style="font-size: 12px; opacity: 0.8;">Amount Due</span>
                      <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: ${brandGold};">${formattedAmount}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="font-size: 12px; opacity: 0.8;">Due Date</span>
                      <p style="margin: 5px 0 0 0; font-size: 16px;">${params.dueDate}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center;">
                ${ctaButton("Pay Invoice", params.paymentUrl)}
              </div>

              <p style="color: ${darkBg}; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #ddd;">
                If you have any questions about this invoice or need to arrange a payment plan, please don't hesitate to contact us.
              </p>
            </div>

            ${emailFooter()}
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Payment Reminder Email Template
 */
export function paymentReminderTemplate(params: {
  clientName: string;
  eventName: string;
  amount: number;
  daysOverdue: number;
  companyName: string;
  paymentUrl?: string;
  tone: "gentle" | "firm" | "final";
}): TemplateResult {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(params.amount);

  let subject = "";
  let greeting = "";
  let body = "";
  let borderColor = brandGold;

  switch (params.tone) {
    case "gentle":
      subject = `Friendly Reminder: Payment Due for ${params.eventName}`;
      greeting = `Dear ${params.clientName},`;
      body = `<p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        We noticed that the payment for <strong>${params.eventName}</strong> is still outstanding. This is just a friendly reminder that your invoice remains unpaid.
      </p>`;
      break;

    case "firm":
      subject = `Outstanding Payment: ${params.eventName} — ${params.daysOverdue} Days Overdue`;
      greeting = `Dear ${params.clientName},`;
      body = `<p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        This is a follow-up regarding your outstanding payment for <strong>${params.eventName}</strong>. Your invoice is now <strong>${params.daysOverdue} days overdue</strong>.
      </p>
      <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 20px 0;">
        Please arrange payment at your earliest convenience to avoid any disruption to future services.
      </p>`;
      borderColor = "#FF9500";
      break;

    case "final":
      subject = `Final Notice: Payment Required for ${params.eventName}`;
      greeting = `Dear ${params.clientName},`;
      body = `<p style="color: #c70039; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>Final Notice:</strong> Your payment of ${formattedAmount} for <strong>${params.eventName}</strong> is now <strong>${params.daysOverdue} days overdue</strong>.
      </p>
      <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 20px 0;">
        Immediate payment is required. Please contact us today to settle this outstanding balance.
      </p>`;
      borderColor = "#c70039";
      break;
  }

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${emailHeader(params.companyName)}

            <div style="padding: 30px 20px;">
              <p style="color: ${darkBg}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>

              ${body}

              <div style="background-color: ${lightGray}; padding: 20px; border-left: 4px solid ${borderColor}; margin: 20px 0;">
                <p style="color: ${darkBg}; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
                  Outstanding Balance
                </p>
                <p style="color: ${darkBg}; margin: 5px 0; font-size: 18px; font-weight: bold;">
                  ${formattedAmount}
                </p>
              </div>

              <div style="text-align: center;">
                ${ctaButton("Pay Now", params.paymentUrl)}
              </div>

              <p style="color: ${darkBg}; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #ddd;">
                If you have already processed this payment, please disregard this notice. If you have questions, please contact us immediately.
              </p>
            </div>

            ${emailFooter()}
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * General Message Email Template
 */
export function generalMessageTemplate(params: {
  clientName: string;
  subject: string;
  body: string;
  companyName: string;
  senderName?: string;
}): TemplateResult {
  return {
    subject: params.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${emailHeader(params.companyName)}

            <div style="padding: 30px 20px;">
              <p style="color: ${darkBg}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${params.clientName}</strong>,
              </p>

              <div style="color: ${darkBg}; font-size: 15px; line-height: 1.8; margin: 20px 0; white-space: pre-wrap;">
                ${params.body}
              </div>

              ${
                params.senderName
                  ? `<p style="color: ${darkBg}; font-size: 14px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #ddd;">
                  Best regards,<br>
                  <strong>${params.senderName}</strong><br>
                  <em>${params.companyName}</em>
                </p>`
                  : ""
              }
            </div>

            ${emailFooter()}
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Event Confirmation Email Template
 */
export function eventConfirmationTemplate(params: {
  clientName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  guestCount: number;
  companyName: string;
}): TemplateResult {
  return {
    subject: `Event Confirmed: ${params.eventName} on ${params.eventDate}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${emailHeader(params.companyName)}

            <div style="padding: 30px 20px;">
              <div style="background-color: ${brandGold}; color: ${darkBg}; padding: 20px; border-radius: 8px; text-align: center; margin: 0 0 25px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">
                  ✓ Your Event is Confirmed!
                </p>
              </div>

              <p style="color: ${darkBg}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${params.clientName}</strong>,
              </p>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                We're thrilled to confirm that <strong>${params.eventName}</strong> is all set! Our team is excited to deliver an exceptional catering experience for you.
              </p>

              <div style="background-color: ${lightGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: ${darkBg}; margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">
                  Event Summary
                </p>
                <p style="color: ${darkBg}; margin: 8px 0; font-size: 14px;">
                  <strong>Event:</strong> ${params.eventName}
                </p>
                <p style="color: ${darkBg}; margin: 8px 0; font-size: 14px;">
                  <strong>Date:</strong> ${params.eventDate}
                </p>
                ${
                  params.eventTime
                    ? `<p style="color: ${darkBg}; margin: 8px 0; font-size: 14px;">
                  <strong>Time:</strong> ${params.eventTime}
                </p>`
                    : ""
                }
                ${
                  params.venue
                    ? `<p style="color: ${darkBg}; margin: 8px 0; font-size: 14px;">
                  <strong>Venue:</strong> ${params.venue}
                </p>`
                    : ""
                }
                <p style="color: ${darkBg}; margin: 8px 0; font-size: 14px;">
                  <strong>Guest Count:</strong> ${params.guestCount} guests
                </p>
              </div>

              <p style="color: ${darkBg}; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                Our culinary and service teams are preparing to make your event unforgettable. We'll be in touch with final details closer to your event date.
              </p>

              <p style="color: ${darkBg}; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; padding-top: 20px; border-top: 1px solid #ddd;">
                If you have any last-minute changes or questions, please don't hesitate to reach out to us.
              </p>
            </div>

            ${emailFooter()}
          </div>
        </body>
      </html>
    `,
  };
}
