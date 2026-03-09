import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentOrg } from "@/lib/organizations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/** Platform fee percentage — defaults to 2.9% */
const PLATFORM_FEE_PERCENT = parseFloat(
  process.env.STRIPE_PLATFORM_FEE_PERCENT || "2.9"
);

/**
 * POST — Generate a shareable Stripe Checkout payment link for a specific
 * installment. The caterer calls this from PaymentScheduleManager. The resulting
 * URL can be copied and sent to the client via email/text.
 *
 * When the caterer has a connected Stripe account, funds route to them with a
 * platform fee. If no Connect account is set up, a direct checkout is created
 * (funds go to the platform Stripe account).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, scheduleItemId, amount, installmentName, organizationId } =
      body;

    if (!eventId || !scheduleItemId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields (eventId, scheduleItemId, amount)" },
        { status: 400 }
      );
    }

    // Verify the event belongs to this user
    const org = await getCurrentOrg();
    let eventQuery = supabase
      .from("events")
      .select("id, name, client_name")
      .eq("id", eventId)
      .eq("user_id", user.id);
    if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
    const { data: event } = await eventQuery.single();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or you don't have access" },
        { status: 404 }
      );
    }

    // Verify the schedule item exists
    const { data: schedule } = await supabase
      .from("payment_schedules")
      .select("*")
      .eq("id", scheduleItemId)
      .eq("event_id", eventId)
      .single();

    if (!schedule) {
      return NextResponse.json(
        { error: "Payment schedule item not found" },
        { status: 404 }
      );
    }

    if (schedule.status === "paid") {
      return NextResponse.json(
        { error: "This installment has already been paid" },
        { status: 400 }
      );
    }

    // Use the schedule's amount (don't trust client-provided amount)
    const validatedAmount = Number(schedule.amount);
    const amountCents = Math.round(validatedAmount * 100);

    // Check if caterer has a connected Stripe account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_onboarded")
      .eq("id", user.id)
      .single();

    const hasConnect =
      profile?.stripe_connect_account_id &&
      profile?.stripe_connect_onboarded === true;

    const platformFeeCents = hasConnect
      ? Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
      : 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cateros.com";

    // Build checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: installmentName || "Event Payment",
              description: `${installmentName || "Payment"} for ${event.name || "your event"}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: eventId,
        payment_schedule_id: scheduleItemId,
        organization_id: organizationId || org?.orgId || "",
        user_id: user.id,
        source: "payment_link",
      },
      success_url: `${appUrl}/events/${eventId}?payment=success`,
      cancel_url: `${appUrl}/events/${eventId}?payment=canceled`,
    };

    // Route funds to caterer's Connect account if available
    if (hasConnect) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: profile!.stripe_connect_account_id!,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Insert a pending payment record
    await supabase.from("payments").insert({
      event_id: eventId,
      proposal_id: schedule.proposal_id || null,
      payment_schedule_id: scheduleItemId,
      organization_id: organizationId || org?.orgId || null,
      amount: validatedAmount,
      payment_method_type: "stripe",
      status: "pending",
      stripe_checkout_session_id: session.id,
      platform_fee: hasConnect ? platformFeeCents / 100 : null,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Payment link generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate payment link: ${message}` },
      { status: 500 }
    );
  }
}
