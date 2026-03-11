import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const plan = body.plan || "pro";

  const rawPriceId = plan === "basic"
    ? process.env.STRIPE_PRICE_ID_BASIC
    : process.env.STRIPE_PRICE_ID_PRO;

  const priceId = rawPriceId?.trim();

  if (!priceId) {
    console.error("No Stripe price ID found for plan:", plan);
    return NextResponse.json({ error: `No Stripe price configured for "${plan}" plan. Check STRIPE_PRICE_ID_${plan.toUpperCase()} env var.` }, { status: 500 });
  }

  if (!priceId.startsWith("price_")) {
    console.error("Invalid Stripe price ID format for plan:", plan);
    return NextResponse.json({ error: `Invalid price ID format for "${plan}" plan.` }, { status: 500 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
    return NextResponse.json({ error: "You already have an active subscription." }, { status: 400 });
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_uid: user.id } });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const host = req.headers.get("host") || "cateros.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.headers.get("origin") || `https://${host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      client_reference_id: user.id,
      subscription_data: { trial_period_days: 14 },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message || "Unknown error");
    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again or contact support." },
      { status: 500 }
    );
  }
}
