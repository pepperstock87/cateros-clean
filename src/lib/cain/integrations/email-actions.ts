/**
 * Email Actions Handler
 * Executes email-related actions after approval
 */

import { createClient } from "@/lib/supabase/server";
import {
  sendEmail,
  type EmailResult,
} from "./email";
import {
  proposalEmailTemplate,
  invoiceEmailTemplate,
  paymentReminderTemplate,
  generalMessageTemplate,
  eventConfirmationTemplate,
} from "./templates";

/**
 * Get company name from business settings
 */
async function getCompanyName(
  userId: string,
  orgId: string | null
): Promise<string> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("business_settings")
      .select("company_name")
      .eq("user_id", userId);

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    const { data } = await query.single();
    return data?.company_name || "C.A.I.N.";
  } catch {
    return "C.A.I.N.";
  }
}

/**
 * Log email send attempt to database
 */
async function logEmailSend(params: {
  userId: string;
  orgId: string | null;
  templateType: "proposal" | "invoice" | "reminder" | "message" | "confirmation";
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  eventId?: string;
  clientId?: string;
  resendMessageId?: string;
  status: "sent" | "failed";
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("cain_email_log").insert({
      user_id: params.userId,
      organization_id: params.orgId,
      template_type: params.templateType,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      event_id: params.eventId,
      client_id: params.clientId,
      resend_message_id: params.resendMessageId,
      status: params.status,
      error: params.error,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("Failed to log email send:", error);
  }
}

/**
 * Fetch event details for email context
 */
async function getEventDetails(eventId: string, userId: string): Promise<{
  name: string;
  event_date: string;
  start_time: string | null;
  guest_count: number;
  venue: string | null;
  client_name: string;
  client_email: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select(
        "name, event_date, start_time, guest_count, venue, client_name, client_email"
      )
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    return data || null;
  } catch {
    return null;
  }
}

/**
 * Fetch proposal details
 */
async function getProposalDetails(proposalId: string, userId: string): Promise<{
  event_id: string;
  total_price: number;
} | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("proposals")
      .select("event_id, total_price")
      .eq("id", proposalId)
      .eq("user_id", userId)
      .single();

    return data || null;
  } catch {
    return null;
  }
}

/**
 * Execute send_proposal action
 */
export async function executeSendProposal(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const companyName = await getCompanyName(params.userId, params.orgId);

    // Get event details
    const event = await getEventDetails(params.eventId, params.userId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Get proposal to get price
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, total_price")
      .eq("event_id", params.eventId)
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!proposal) {
      return { success: false, error: "No proposal found for this event" };
    }

    const template = proposalEmailTemplate({
      clientName: params.clientName,
      eventName: event.name,
      eventDate: new Date(event.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      suggestedPrice: proposal.total_price || 0,
      companyName,
      proposalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`,
    });

    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
      replyTo: event.client_email || undefined,
    });

    if (!result.success) {
      await logEmailSend({
        userId: params.userId,
        orgId: params.orgId,
        templateType: "proposal",
        recipientEmail: params.clientEmail,
        recipientName: params.clientName,
        subject: template.subject,
        eventId: params.eventId,
        status: "failed",
        error: result.error,
      });

      return { success: false, error: `Failed to send email: ${result.error}` };
    }

    await logEmailSend({
      userId: params.userId,
      orgId: params.orgId,
      templateType: "proposal",
      recipientEmail: params.clientEmail,
      recipientName: params.clientName,
      subject: template.subject,
      eventId: params.eventId,
      resendMessageId: result.messageId,
      status: "sent",
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending proposal email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute send_invoice action
 */
export async function executeSendInvoice(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
  invoiceId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const companyName = await getCompanyName(params.userId, params.orgId);

    // Get event details
    const event = await getEventDetails(params.eventId, params.userId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Try to find invoice, or use proposal as fallback
    let invoiceData: { id: string; total_amount?: number; due_date?: string } | null = null;

    if (params.invoiceId) {
      const { data } = await supabase
        .from("invoices")
        .select("id, total_amount, due_date")
        .eq("id", params.invoiceId)
        .eq("user_id", params.userId)
        .single();
      invoiceData = data;
    } else {
      // Fall back to proposal
      const { data } = await supabase
        .from("proposals")
        .select("id, total_price")
        .eq("event_id", params.eventId)
        .eq("user_id", params.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        invoiceData = { id: data.id, total_amount: data.total_price };
      }
    }

    if (!invoiceData) {
      return { success: false, error: "No invoice or proposal found" };
    }

    const invoiceNumber = params.invoiceId || invoiceData.id.slice(0, 8).toUpperCase();
    const amount = invoiceData.total_amount || 0;
    const dueDate = invoiceData.due_date
      ? new Date(invoiceData.due_date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Upon Receipt";

    const template = invoiceEmailTemplate({
      clientName: params.clientName,
      eventName: event.name,
      invoiceNumber,
      amount,
      dueDate,
      companyName,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceData.id}`,
    });

    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
      replyTo: event.client_email || undefined,
    });

    if (!result.success) {
      await logEmailSend({
        userId: params.userId,
        orgId: params.orgId,
        templateType: "invoice",
        recipientEmail: params.clientEmail,
        recipientName: params.clientName,
        subject: template.subject,
        eventId: params.eventId,
        status: "failed",
        error: result.error,
        metadata: { invoiceId: invoiceData.id },
      });

      return { success: false, error: `Failed to send email: ${result.error}` };
    }

    await logEmailSend({
      userId: params.userId,
      orgId: params.orgId,
      templateType: "invoice",
      recipientEmail: params.clientEmail,
      recipientName: params.clientName,
      subject: template.subject,
      eventId: params.eventId,
      resendMessageId: result.messageId,
      status: "sent",
      metadata: { invoiceId: invoiceData.id },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending invoice email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute send_payment_reminder action
 */
export async function executeSendPaymentReminder(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
  amount: number;
  daysOverdue: number;
  tone?: "gentle" | "firm" | "final";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const companyName = await getCompanyName(params.userId, params.orgId);

    // Get event details
    const event = await getEventDetails(params.eventId, params.userId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    const tone = params.tone || "gentle";

    const template = paymentReminderTemplate({
      clientName: params.clientName,
      eventName: event.name,
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      companyName,
      tone,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment`,
    });

    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
      replyTo: event.client_email || undefined,
    });

    if (!result.success) {
      await logEmailSend({
        userId: params.userId,
        orgId: params.orgId,
        templateType: "reminder",
        recipientEmail: params.clientEmail,
        recipientName: params.clientName,
        subject: template.subject,
        eventId: params.eventId,
        status: "failed",
        error: result.error,
        metadata: { tone, daysOverdue: params.daysOverdue },
      });

      return { success: false, error: `Failed to send email: ${result.error}` };
    }

    await logEmailSend({
      userId: params.userId,
      orgId: params.orgId,
      templateType: "reminder",
      recipientEmail: params.clientEmail,
      recipientName: params.clientName,
      subject: template.subject,
      eventId: params.eventId,
      resendMessageId: result.messageId,
      status: "sent",
      metadata: { tone, daysOverdue: params.daysOverdue },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending payment reminder email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute send_message action
 */
export async function executeSendMessage(params: {
  userId: string;
  orgId: string | null;
  clientEmail: string;
  clientName: string;
  subject: string;
  body: string;
  senderName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const companyName = await getCompanyName(params.userId, params.orgId);

    const template = generalMessageTemplate({
      clientName: params.clientName,
      subject: params.subject,
      body: params.body,
      companyName,
      senderName: params.senderName,
    });

    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
    });

    if (!result.success) {
      await logEmailSend({
        userId: params.userId,
        orgId: params.orgId,
        templateType: "message",
        recipientEmail: params.clientEmail,
        recipientName: params.clientName,
        subject: template.subject,
        status: "failed",
        error: result.error,
        metadata: { senderName: params.senderName },
      });

      return { success: false, error: `Failed to send email: ${result.error}` };
    }

    await logEmailSend({
      userId: params.userId,
      orgId: params.orgId,
      templateType: "message",
      recipientEmail: params.clientEmail,
      recipientName: params.clientName,
      subject: template.subject,
      resendMessageId: result.messageId,
      status: "sent",
      metadata: { senderName: params.senderName },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending message email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute event_confirmation action
 */
export async function executeEventConfirmation(params: {
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const companyName = await getCompanyName(params.userId, params.orgId);

    // Get event details
    const event = await getEventDetails(params.eventId, params.userId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    const template = eventConfirmationTemplate({
      clientName: params.clientName,
      eventName: event.name,
      eventDate: new Date(event.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      eventTime: event.start_time || undefined,
      venue: event.venue || undefined,
      guestCount: event.guest_count,
      companyName,
    });

    const result = await sendEmail({
      to: params.clientEmail,
      subject: template.subject,
      html: template.html,
      replyTo: event.client_email || undefined,
    });

    if (!result.success) {
      await logEmailSend({
        userId: params.userId,
        orgId: params.orgId,
        templateType: "confirmation",
        recipientEmail: params.clientEmail,
        recipientName: params.clientName,
        subject: template.subject,
        eventId: params.eventId,
        status: "failed",
        error: result.error,
      });

      return { success: false, error: `Failed to send email: ${result.error}` };
    }

    await logEmailSend({
      userId: params.userId,
      orgId: params.orgId,
      templateType: "confirmation",
      recipientEmail: params.clientEmail,
      recipientName: params.clientName,
      subject: template.subject,
      eventId: params.eventId,
      resendMessageId: result.messageId,
      status: "sent",
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending event confirmation email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
