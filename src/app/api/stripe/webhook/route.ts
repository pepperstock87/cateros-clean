import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async function updateProfile(customerId: string, data: Record<string, unknown>) {
    await supabase.from("profiles").update(data).eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0].price.id;
      let planTier: "basic" | "pro" = "pro";
      if (process.env.STRIPE_PRICE_ID_BASIC && priceId === process.env.STRIPE_PRICE_ID_BASIC) {
        planTier = "basic";
      } else if (process.env.STRIPE_PRICE_ID_PRO && priceId === process.env.STRIPE_PRICE_ID_PRO) {
        planTier = "pro";
      }
      
      await updateProfile(sub.customer as string, {
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        plan_tier: planTier,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateProfile(sub.customer as string, {
        subscription_status: "canceled",
        plan_tier: "free",
      });
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only handle event payment sessions (not subscription checkouts)
      if (session.metadata?.event_id) {
        const eventId = session.metadata.event_id;
        const scheduleId = session.metadata.payment_schedule_id;

        // Update the payment record
        await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("stripe_checkout_session_id", session.id);

        // Update the payment schedule item if linked
        if (scheduleId) {
          await supabase
            .from("payment_schedules")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", scheduleId);
        }

        // Log activity
        await supabase.from("event_activity").insert({
          event_id: eventId,
          user_id: session.metadata.user_id || null,
          type: "payment_added",
          description: `Payment of $${(session.amount_total! / 100).toFixed(2)} received via Stripe`,
          metadata: {
            amount: session.amount_total! / 100,
            method: "stripe",
            stripe_session_id: session.id,
          },
        });

        // Send payment received notification + email
        if (session.metadata.user_id) {
          const amountFormatted = `$${(session.amount_total! / 100).toFixed(2)}`;

          // Fetch event name for the email template
          let paymentEventName = "Your Event";
          const { data: eventRow } = await supabase
            .from("events")
            .select("name")
            .eq("id", eventId)
            .single();
          if (eventRow?.name) paymentEventName = eventRow.name;

          // Non-blocking: createNotification handles email internally
          createNotification({
            userId: session.metadata.user_id,
            type: "payment_received",
            title: "Payment Received",
            message: `Payment of ${amountFormatted} received for "${paymentEventName}" via Stripe.`,
            linkUrl: `/events/${eventId}`,
            emailData: {
              amount: amountFormatted,
              eventName: paymentEventName,
              eventUrl: `/events/${eventId}`,
            },
          }).catch((err) => {
            console.error("[webhook] Payment notification error:", err);
          });
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      // Update payment record to failed
      if (intent.metadata?.event_id) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: intent.last_payment_error?.message || "Payment failed",
          })
          .eq("stripe_payment_intent_id", intent.id);

        // Update schedule item if linked
        if (intent.metadata?.payment_schedule_id) {
          await supabase
            .from("payment_schedules")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", intent.metadata.payment_schedule_id);
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      if (paymentIntentId) {
        const isFullRefund = charge.amount_refunded === charge.amount;
        await supabase
          .from("payments")
          .update({
            status: isFullRefund ? "refunded" : "partially_refunded",
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
      }
      break;
    }

    // ------------------------------------------------------------------
    // Stripe Connect events
    // ------------------------------------------------------------------
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const connectId = account.id;

      const chargesEnabled = account.charges_enabled ?? false;
      const payoutsEnabled = account.payouts_enabled ?? false;
      const detailsSubmitted = account.details_submitted ?? false;
      const onboarded = chargesEnabled && payoutsEnabled && detailsSubmitted;

      // Update the profile that has this connect account
      await supabase
        .from("profiles")
        .update({ stripe_connect_onboarded: onboarded })
        .eq("stripe_connect_account_id", connectId);

      break;
    }

    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;

      // If the transfer has metadata linking to a payment, update the record
      if (transfer.source_transaction) {
        await supabase
          .from("payments")
          .update({ stripe_transfer_id: transfer.id })
          .eq("stripe_payment_intent_id", transfer.source_transaction as string);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
