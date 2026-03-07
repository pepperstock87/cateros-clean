import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareToken, paymentScheduleId, amount } = body;

    // Validate inputs
    if (!shareToken || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up proposal by share token to get event details
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(
        "id, event_id, user_id, organization_id, title, event:events(name, client_name)"
      )
      .eq("share_token", shareToken)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Get the caterer's business settings for branding
    const { data: settings } = await supabase
      .from("business_settings")
      .select("business_name")
      .eq("user_id", proposal.user_id)
      .maybeSingle();

    const eventName = (proposal.event as any)?.name || "Event";
    const businessName = settings?.business_name || "Catering";

    // Validate payment_schedule_id belongs to this event if provided
    if (paymentScheduleId) {
      const { data: schedule, error: scheduleError } = await supabase
        .from("payment_schedules")
        .select("id, event_id")
        .eq("id", paymentScheduleId)
        .eq("event_id", proposal.event_id)
        .single();

      if (scheduleError || !schedule) {
        return NextResponse.json(
          { error: "Invalid schedule" },
          { status: 400 }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${eventName} - Payment`,
              description: `Payment to ${businessName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: proposal.event_id,
        proposal_id: proposal.id,
        organization_id: proposal.organization_id || "",
        payment_schedule_id: paymentScheduleId || "",
        user_id: proposal.user_id,
      },
      success_url: `${appUrl}/p/${shareToken}/portal?payment=success`,
      cancel_url: `${appUrl}/p/${shareToken}/portal?payment=canceled`,
    });

    // Create pending payment record
    const { error: insertError } = await supabase.from("payments").insert({
      organization_id: proposal.organization_id || null,
      event_id: proposal.event_id,
      proposal_id: proposal.id,
      payment_schedule_id: paymentScheduleId || null,
      stripe_checkout_session_id: session.id,
      amount: amount,
      currency: "usd",
      payment_method_type: "card",
      status: "pending",
    });

    if (insertError) {
      console.error("Failed to create payment record:", insertError);
      // Don't block the checkout — the webhook will still process the payment
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
