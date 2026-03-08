"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import { logActivity } from "@/lib/activity";
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
