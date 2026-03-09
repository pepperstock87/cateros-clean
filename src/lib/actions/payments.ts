"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

// ---------------------------------------------------------------------------
// 1. Create Payment Schedule
// ---------------------------------------------------------------------------
export async function createPaymentScheduleAction(data: {
  eventId: string;
  proposalId?: string;
  installments: {
    name: string;
    amount: number;
    percentage?: number;
    dueDate?: string;
  }[];
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Verify user owns the event
    let eventQuery = supabase
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .eq("user_id", user.id);
    if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
    const { data: event } = await eventQuery.single();

    if (!event) return { error: "Event not found" };

    // Delete any existing schedules for this event (replace approach)
    let deleteQuery = supabase
      .from("payment_schedules")
      .delete()
      .eq("event_id", data.eventId);
    if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
    await deleteQuery;

    // Insert all installments with sort_order based on array index
    const rows = data.installments.map((inst, index) => ({
      event_id: data.eventId,
      proposal_id: data.proposalId || null,
      organization_id: org?.orgId || null,
      installment_name: inst.name,
      amount: inst.amount,
      percentage: inst.percentage || null,
      due_date: inst.dueDate || null,
      sort_order: index,
      status: "pending",
    }));

    const { error } = await supabase.from("payment_schedules").insert(rows);

    if (error) return { error: error.message };

    revalidatePath(`/events/${data.eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 2. Update Payment Schedule Item
// ---------------------------------------------------------------------------
export async function updatePaymentScheduleItemAction(
  scheduleId: string,
  data: {
    installment_name?: string;
    amount?: number;
    due_date?: string;
    status?: string;
  }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.installment_name !== undefined) updatePayload.installment_name = data.installment_name;
    if (data.amount !== undefined) updatePayload.amount = data.amount;
    if (data.due_date !== undefined) updatePayload.due_date = data.due_date;
    if (data.status !== undefined) updatePayload.status = data.status;

    let updateQuery = supabase
      .from("payment_schedules")
      .update(updatePayload)
      .eq("id", scheduleId);
    if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
    const { data: updated, error } = await updateQuery.select("event_id").single();

    if (error) return { error: error.message };

    revalidatePath(`/events/${updated.event_id}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 3. Delete Payment Schedule Item
// ---------------------------------------------------------------------------
export async function deletePaymentScheduleItemAction(
  scheduleId: string,
  eventId: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { error } = await supabase
      .from("payment_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("event_id", eventId);

    if (error) return { error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 4. Record Manual Payment
// ---------------------------------------------------------------------------
export async function recordManualPaymentAction(data: {
  eventId: string;
  paymentScheduleId?: string;
  amount: number;
  paymentMethodType: string;
  note?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Insert payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      event_id: data.eventId,
      payment_schedule_id: data.paymentScheduleId || null,
      organization_id: org?.orgId || null,
      amount: data.amount,
      payment_method_type: data.paymentMethodType,
      note: data.note || null,
      status: "paid",
      paid_at: new Date().toISOString(),
    });

    if (paymentError) return { error: paymentError.message };

    // If linked to a schedule item, mark it as paid
    if (data.paymentScheduleId) {
      let scheduleUpdate = supabase
        .from("payment_schedules")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", data.paymentScheduleId);
      if (org?.orgId) scheduleUpdate = scheduleUpdate.eq("organization_id", org.orgId);
      await scheduleUpdate;
    }

    // Log activity
    await logActivity(
      data.eventId,
      user.id,
      "payment_added",
      `Manual payment of $${data.amount.toFixed(2)} recorded via ${data.paymentMethodType}`,
      {
        amount: data.amount,
        method: data.paymentMethodType,
        payment_schedule_id: data.paymentScheduleId || null,
      }
    );

    revalidatePath(`/events/${data.eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 5. Get Payment Summary
// ---------------------------------------------------------------------------
export async function getPaymentSummaryAction(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Fetch all payment schedules for this event
    let schedulesQuery = supabase
      .from("payment_schedules")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });
    if (org?.orgId) schedulesQuery = schedulesQuery.eq("organization_id", org.orgId);
    const { data: schedules, error: schedulesError } = await schedulesQuery;

    if (schedulesError) return { error: schedulesError.message };

    // Fetch all paid payments for this event
    let paymentsQuery = supabase
      .from("payments")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "paid");
    if (org?.orgId) paymentsQuery = paymentsQuery.eq("organization_id", org.orgId);
    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) return { error: paymentsError.message };

    // Calculate summary
    const totalScheduled = (schedules ?? []).reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
    const totalPaid = (payments ?? []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const balanceRemaining = totalScheduled - totalPaid;

    // Next due: first schedule item that is pending or due
    const nextDue =
      (schedules ?? []).find(
        (s) => s.status === "pending" || s.status === "due"
      ) || null;

    return {
      success: true,
      summary: {
        totalScheduled,
        totalPaid,
        balanceRemaining,
        nextDue,
        schedules: schedules ?? [],
        payments: payments ?? [],
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 6. Create Stripe Checkout Session (one-time payment)
// ---------------------------------------------------------------------------
export async function createStripeCheckoutAction(data: {
  eventId: string;
  paymentScheduleId: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Payment for Event`,
              description: `Installment payment — Event ${data.eventId}`,
            },
            unit_amount: Math.round(data.amount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: data.eventId,
        payment_schedule_id: data.paymentScheduleId,
        organization_id: org?.orgId || "",
      },
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
    });

    // Insert a pending payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      event_id: data.eventId,
      payment_schedule_id: data.paymentScheduleId,
      organization_id: org?.orgId || null,
      amount: data.amount,
      payment_method_type: "stripe",
      status: "pending",
      stripe_session_id: session.id,
    });

    if (paymentError) return { error: paymentError.message };

    return { url: session.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 7. Initiate Refund
// ---------------------------------------------------------------------------
export async function initiateRefundAction(data: {
  paymentId: string;
  amount?: number; // optional — omit for full refund
  reason?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Fetch the payment record
    let paymentQuery = supabase
      .from("payments")
      .select("*")
      .eq("id", data.paymentId);
    if (org?.orgId) paymentQuery = paymentQuery.eq("organization_id", org.orgId);
    const { data: payment, error: fetchError } = await paymentQuery.single();

    if (fetchError || !payment) return { error: "Payment not found" };

    if (!payment.stripe_payment_intent_id) {
      return { error: "No Stripe payment intent associated with this payment. Manual payments cannot be refunded via Stripe." };
    }

    if (payment.status === "refunded") {
      return { error: "This payment has already been fully refunded" };
    }

    // Determine refund amount in cents
    const refundAmountCents = data.amount
      ? Math.round(data.amount * 100)
      : Math.round(Number(payment.amount) * 100);

    const fullAmountCents = Math.round(Number(payment.amount) * 100);
    const isPartial = refundAmountCents < fullAmountCents;

    // Create Stripe refund
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: "requested_by_customer",
    });

    // Update payment status
    const newStatus = isPartial ? "partially_refunded" : "refunded";
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.paymentId);

    if (updateError) return { error: updateError.message };

    // Log activity
    const refundDisplay = (refundAmountCents / 100).toFixed(2);
    await logActivity(
      payment.event_id,
      user.id,
      "refund_initiated",
      `${isPartial ? "Partial refund" : "Full refund"} of $${refundDisplay} initiated${data.reason ? `: ${data.reason}` : ""}`,
      {
        payment_id: data.paymentId,
        amount: refundAmountCents / 100,
        partial: isPartial,
        reason: data.reason || null,
      }
    );

    revalidatePath(`/events/${payment.event_id}`);
    return { success: true, status: newStatus };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 8. Send Payment Reminder
// ---------------------------------------------------------------------------
export async function sendPaymentReminderAction(data: {
  eventId: string;
  scheduleItemId: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Fetch the event
    let eventQuery = supabase
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .eq("user_id", user.id);
    if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
    const { data: event, error: eventError } = await eventQuery.single();

    if (eventError || !event) return { error: "Event not found" };

    // Fetch the schedule item
    let scheduleQuery = supabase
      .from("payment_schedules")
      .select("*")
      .eq("id", data.scheduleItemId)
      .eq("event_id", data.eventId);
    if (org?.orgId) scheduleQuery = scheduleQuery.eq("organization_id", org.orgId);
    const { data: scheduleItem, error: scheduleError } =
      await scheduleQuery.single();

    if (scheduleError || !scheduleItem) return { error: "Payment schedule item not found" };

    // Get client email from the event
    const clientEmail = event.client_email;
    if (!clientEmail) return { error: "No client email found for this event" };

    // Look up the share_token from proposals to build a portal payment link
    const { data: proposal } = await supabase
      .from("proposals")
      .select("share_token")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalLink = proposal?.share_token
      ? `${appUrl}/p/${proposal.share_token}/portal`
      : null;

    const amountDisplay = Number(scheduleItem.amount).toFixed(2);
    const dueDateDisplay = scheduleItem.due_date
      ? new Date(scheduleItem.due_date).toLocaleDateString()
      : "soon";

    // Send in-app notification to caterer (confirmation that reminder was sent)
    await createNotification({
      userId: user.id,
      type: "payment_reminder",
      title: "Payment Reminder Sent",
      message: `Reminder sent to ${clientEmail} for $${amountDisplay} (${scheduleItem.installment_name}) due ${dueDateDisplay}.`,
      linkUrl: `/events/${data.eventId}`,
      emailData: {
        amount: `$${amountDisplay}`,
        eventName: event.name,
        eventUrl: `/events/${data.eventId}`,
      },
    });

    // Send direct email to the client
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Cateros <noreply@cateros.com>",
          to: clientEmail,
          subject: `Payment Reminder: $${amountDisplay} due ${dueDateDisplay}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Payment Reminder</h2>
              <p>Hi,</p>
              <p>This is a friendly reminder that your payment of <strong>$${amountDisplay}</strong> for <strong>${scheduleItem.installment_name}</strong> is due <strong>${dueDateDisplay}</strong>.</p>
              ${portalLink ? `<p><a href="${portalLink}" style="display: inline-block; padding: 10px 20px; background-color: #D4A373; color: white; text-decoration: none; border-radius: 6px;">Make Payment</a></p>` : ""}
              <p>Thank you,<br/>${event.name}</p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send reminder email:", emailErr);
      // Don't fail the action if email fails — notification was still created
    }

    // Log activity
    await logActivity(
      data.eventId,
      user.id,
      "payment_reminder_sent",
      `Payment reminder sent to ${clientEmail} for $${amountDisplay} due ${dueDateDisplay}`,
      {
        schedule_item_id: data.scheduleItemId,
        client_email: clientEmail,
      }
    );

    revalidatePath(`/events/${data.eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}

// ---------------------------------------------------------------------------
// 9. Get Payout History
// ---------------------------------------------------------------------------
export async function getPayoutHistoryAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const org = await getCurrentOrg();

    // Fetch the user's event IDs first
    let eventsQuery = supabase
      .from("events")
      .select("id")
      .eq("user_id", user.id);
    if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) return { error: eventsError.message };

    const eventIds = (events ?? []).map((e) => e.id);
    if (eventIds.length === 0) return { success: true, payouts: [] };

    // Fetch all paid payments with stripe_transfer_id for those events
    const { data: payouts, error: payoutsError } = await supabase
      .from("payments")
      .select("*, events(name, client_name)")
      .in("event_id", eventIds)
      .eq("status", "paid")
      .not("stripe_transfer_id", "is", null)
      .order("paid_at", { ascending: false });

    if (payoutsError) return { error: payoutsError.message };

    return { success: true, payouts: payouts ?? [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}
