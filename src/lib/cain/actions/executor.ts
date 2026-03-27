/**
 * CAIN Action Executor
 * Routes approved actions to the appropriate server action handlers
 */

import type { CainPendingAction, CainActionResult } from "./types";
import { assignStaffAction } from "@/lib/actions/staffAssignments";
import { updateProposalStatusAction } from "@/lib/actions/proposals";
import { updateEventDetailsAction } from "@/lib/actions/events";
import {
  executeSendProposal as emailSendProposal,
  executeSendInvoice,
  executeSendPaymentReminder,
  executeSendMessage,
  executeEventConfirmation,
} from "@/lib/cain/integrations/email-actions";
import { markExecuted } from "./queue";

/**
 * Execute an approved action by routing to the appropriate handler
 */
export async function executeAction(action: CainPendingAction): Promise<CainActionResult> {
  try {
    // Validate action is approved
    if (action.status !== "approved") {
      return {
        success: false,
        error: `Cannot execute action with status '${action.status}'`,
      };
    }

    // Route to appropriate executor based on action type
    let result: CainActionResult;

    switch (action.action_type) {
      case "assign_staff":
        result = await executeAssignStaff(action);
        break;

      case "send_proposal":
        result = await executeSendProposal(action);
        break;

      case "update_event_status":
        result = await executeUpdateEventStatus(action);
        break;

      case "confirm_event":
        result = await executeConfirmEvent(action);
        break;

      case "cancel_event":
        result = await executeCancelEvent(action);
        break;

      case "send_invoice":
        result = await executeEmailSendInvoice(action);
        break;

      case "send_payment_reminder":
        result = await executeEmailSendPaymentReminder(action);
        break;

      case "send_message":
        result = await executeEmailSendMessage(action);
        break;

      // Add more action types as they're implemented
      case "create_purchase_order":
      case "create_client":
      case "update_inventory":
      case "create_event":
      case "update_pricing":
      case "sync_quickbooks":
      case "export_payroll":
        return {
          success: false,
          error: `Action type '${action.action_type}' not yet implemented`,
        };

      default:
        const _exhaustive: never = action.action_type;
        return { success: false, error: `Unknown action type: ${_exhaustive}` };
    }

    // Log execution result
    await markExecuted(action.user_id, action.id, result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const result = { success: false, error: errorMessage };

    // Log the failure
    await markExecuted(action.user_id, action.id, result).catch(() => {
      // Ignore errors logging failure
    });

    return result;
  }
}

/**
 * Execute send_invoice action
 */
async function executeEmailSendInvoice(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "send_invoice") {
    return { success: false, error: "Invalid payload type for send_invoice" };
  }

  const { invoiceId, clientEmail } = action.payload;

  try {
    // Get invoice/proposal to find event
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Try to get from invoices table first
    let eventId: string | null = null;
    let clientName = "Valued Client";
    let actualClientEmail = clientEmail;

    const { data: invoice } = await supabase
      .from("invoices")
      .select("event_id, client_email, client_name")
      .eq("id", invoiceId)
      .eq("user_id", action.user_id)
      .single();

    if (invoice) {
      eventId = invoice.event_id;
      clientName = invoice.client_name || clientName;
      actualClientEmail = clientEmail || invoice.client_email;
    } else {
      // Fall back to proposal
      const { data: proposal } = await supabase
        .from("proposals")
        .select("id, event_id, client_name, client_email")
        .eq("id", invoiceId)
        .eq("user_id", action.user_id)
        .single();

      if (proposal) {
        eventId = proposal.event_id;
        clientName = proposal.client_name || clientName;
        actualClientEmail = clientEmail || proposal.client_email;
      }
    }

    if (!eventId || !actualClientEmail) {
      return { success: false, error: "Could not find invoice/proposal or client email" };
    }

    const emailResult = await executeSendInvoice({
      userId: action.user_id,
      orgId: action.organization_id,
      eventId,
      clientEmail: actualClientEmail,
      clientName,
      invoiceId,
    });

    return emailResult.success ? { success: true, data: { invoiceId } } : { success: false, error: emailResult.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute send_payment_reminder action
 */
async function executeEmailSendPaymentReminder(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "send_payment_reminder") {
    return { success: false, error: "Invalid payload type for send_payment_reminder" };
  }

  const { invoiceId, clientEmail } = action.payload;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Get invoice to find event and amount
    let eventId: string | null = null;
    let clientName = "Valued Client";
    let actualClientEmail = clientEmail;
    let amount = 0;

    const { data: invoice } = await supabase
      .from("invoices")
      .select("event_id, client_email, client_name, total_amount, due_date")
      .eq("id", invoiceId)
      .eq("user_id", action.user_id)
      .single();

    if (invoice) {
      eventId = invoice.event_id;
      clientName = invoice.client_name || clientName;
      actualClientEmail = clientEmail || invoice.client_email;
      amount = invoice.total_amount || 0;
    }

    if (!eventId || !actualClientEmail) {
      return { success: false, error: "Could not find invoice or client email" };
    }

    // Calculate days overdue (simple estimation)
    const dueDate = invoice?.due_date ? new Date(invoice.due_date) : new Date();
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    const emailResult = await executeSendPaymentReminder({
      userId: action.user_id,
      orgId: action.organization_id,
      eventId,
      clientEmail: actualClientEmail,
      clientName,
      amount,
      daysOverdue,
      tone: daysOverdue > 30 ? "final" : daysOverdue > 14 ? "firm" : "gentle",
    });

    return emailResult.success ? { success: true, data: { invoiceId } } : { success: false, error: emailResult.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute send_message action
 */
async function executeEmailSendMessage(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "send_message") {
    return { success: false, error: "Invalid payload type for send_message" };
  }

  const { recipientId, recipientEmail, message } = action.payload;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Get recipient details
    let actualEmail = recipientEmail;
    let clientName = "Valued Client";

    if (!actualEmail && recipientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("email, name")
        .eq("id", recipientId)
        .eq("user_id", action.user_id)
        .single();

      if (client) {
        actualEmail = client.email;
        clientName = client.name || clientName;
      }
    }

    if (!actualEmail) {
      return { success: false, error: "Could not determine recipient email" };
    }

    const emailResult = await executeSendMessage({
      userId: action.user_id,
      orgId: action.organization_id,
      clientEmail: actualEmail,
      clientName,
      subject: "Message from Your Caterer",
      body: message,
    });

    return emailResult.success ? { success: true, data: { recipientId } } : { success: false, error: emailResult.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute assign_staff action
 */
async function executeAssignStaff(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "assign_staff") {
    return { success: false, error: "Invalid payload type for assign_staff" };
  }

  const { eventId, staffMemberId, role, startTime, endTime } = action.payload;

  try {
    const result = await assignStaffAction(eventId, staffMemberId, role, startTime, endTime);

    if ("error" in result) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { assignmentId: result.success ? eventId : null } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute send_proposal action
 */
async function executeSendProposal(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "send_proposal") {
    return { success: false, error: "Invalid payload type for send_proposal" };
  }

  const { proposalId, clientEmail, includeAttachment } = action.payload;

  try {
    // Get proposal to find associated event and client
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, event_id, client_email, client_name")
      .eq("id", proposalId)
      .eq("user_id", action.user_id)
      .single();

    if (!proposal) {
      return { success: false, error: "Proposal not found" };
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("id, client_name, client_email")
      .eq("id", proposal.event_id)
      .eq("user_id", action.user_id)
      .single();

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Send email
    const emailResult = await emailSendProposal({
      userId: action.user_id,
      orgId: action.organization_id,
      eventId: proposal.event_id,
      clientEmail: clientEmail || event.client_email || proposal.client_email || "",
      clientName: event.client_name || "Valued Client",
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    // Mark proposal as sent
    const statusResult = await updateProposalStatusAction(proposalId, "sent");
    if ("error" in statusResult) {
      return { success: false, error: statusResult.error };
    }

    return { success: true, data: { proposalId, status: "sent" } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute update_event_status action
 */
async function executeUpdateEventStatus(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "update_event_status") {
    return { success: false, error: "Invalid payload type for update_event_status" };
  }

  const { eventId, status } = action.payload;

  try {
    // Create FormData to match updateEventDetailsAction signature
    const formData = new FormData();
    formData.append("status", status);

    // Fetch current event to get all required fields
    // (updateEventDetailsAction requires all form fields)
    // This is a workaround; ideally we'd have a simpler updateEventStatusAction
    // For now, we'll mark this as requiring more work

    return {
      success: false,
      error: "update_event_status requires access to full event data - use confirm_event or cancel_event instead",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute confirm_event action
 */
async function executeConfirmEvent(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "confirm_event") {
    return { success: false, error: "Invalid payload type for confirm_event" };
  }

  const { eventId } = action.payload;

  try {
    // Find the proposal for this event
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (!proposal) {
      return { success: false, error: "No proposal found for this event" };
    }

    // Mark proposal as booked (which also updates event to confirmed)
    const result = await updateProposalStatusAction(proposal.id, "booked");

    if ("error" in result) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { eventId, status: "confirmed" } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Execute cancel_event action
 */
async function executeCancelEvent(action: CainPendingAction): Promise<CainActionResult> {
  if (action.payload.type !== "cancel_event") {
    return { success: false, error: "Invalid payload type for cancel_event" };
  }

  const { eventId } = action.payload;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update event status to canceled
    const { error } = await supabase
      .from("events")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { eventId, status: "canceled" } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
