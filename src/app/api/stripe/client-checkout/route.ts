import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * Client-facing Stripe checkout for portal payments.
 * Does NOT require auth — validates via share_token instead.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareToken, paymentScheduleId, amount, installmentName } = body;

    if (!shareToken || !paymentScheduleId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate share token and get proposal + event
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, event_id, user_id, status, event:events(id, name, client_name)")
      .eq("share_token", shareToken)
      .single();

    if (!proposal) {
      return NextResponse.json(
        { error: "Invalid share token" },
        { status: 404 }
      );
    }

    // Verify the payment schedule item exists and belongs to this event
    const { data: schedule } = await supabase
      .from("payment_schedules")
      .select("*")
      .eq("id", paymentScheduleId)
      .eq("event_id", proposal.event_id)
      .single();

    if (!schedule) {
      return NextResponse.json(
        { error: "Payment schedule not found" },
        { status: 404 }
      );
    }

    if (schedule.status === "paid") {
      return NextResponse.json(
        { error: "This installment has already been paid" },
        { status: 400 }
      );
    }

    // Validate amount matches the schedule — don't trust client-provided amount
    const validatedAmount = schedule.amount;

    const eventData = proposal.event as unknown;
    const event = (Array.isArray(eventData) ? eventData[0] : eventData) as { id: string; name: string; client_name: string } | null;
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${shareToken}/portal`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: installmentName || "Event Payment",
              description: event?.name
                ? `${installmentName || "Payment"} for ${event.name}`
                : undefined,
            },
            unit_amount: Math.round(validatedAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: proposal.event_id,
        payment_schedule_id: paymentScheduleId,
        proposal_id: proposal.id,
        share_token: shareToken,
        source: "client_portal",
      },
      success_url: `${portalUrl}?payment=success`,
      cancel_url: `${portalUrl}?payment=canceled`,
    });

    // Insert a pending payment record
    await supabase.from("payments").insert({
      event_id: proposal.event_id,
      proposal_id: proposal.id,
      payment_schedule_id: paymentScheduleId,
      organization_id: schedule.organization_id || null,
      amount: validatedAmount,
      payment_method_type: "stripe",
      status: "pending",
      stripe_checkout_session_id: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Client checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
