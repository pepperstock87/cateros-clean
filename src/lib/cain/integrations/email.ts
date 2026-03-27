/**
 * Email Service
 * Core email sending service using Resend
 */

import { Resend } from "resend";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend
 * Gracefully handles missing API key
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not configured - email will not be sent");
      return {
        success: false,
        error: "Email service not configured (missing RESEND_API_KEY)",
      };
    }

    const resend = new Resend(apiKey);

    const fromEmail = params.from || process.env.EMAIL_FROM || "C.A.I.N. <noreply@cateros.com>";

    const response = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo && { reply_to: params.replyTo }),
      ...(params.attachments && { attachments: params.attachments }),
    });

    if (response.error) {
      console.error("Resend error:", response.error);
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Email sending error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
