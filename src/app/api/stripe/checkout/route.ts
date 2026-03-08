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

  // Log env vars present (names only, not values) for debugging
  console.log("Stripe env check:", {
    STRIPE_PRICE_ID_BASIC: !!process.env.STRIPE_PRICE_ID_BASIC,
    STRIPE_PRICE_ID_PRO: !!process.env.STRIPE_PRICE_ID_PRO,
    STRIPE_PRICE_ID_MONTHLY: !!process.env.STRIPE_PRICE_ID_MONTHLY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "(not set)",
  }, "| requested plan:", plan);

  const rawPriceId = plan === "basic"
    ? (process.env.STRIPE_PRICE_ID_BASIC || process.env.STRIPE_PRICE_ID_MONTHLY)
    : (process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID_MONTHLY);

  const priceId = rawPriceId?.trim();

  if (!priceId) {
    console.error("No Stripe price ID found for plan:", plan);
    return NextResponse.json({ error: `No Stripe price configured for "${plan}" plan. Check STRIPE_PRICE_ID_${plan.toUpperCase()} env var.` }, { status: 500 });
  }

  if (!priceId.startsWith("price_")) {
    console.error("Invalid Stripe price ID format:", JSON.stringify(priceId), "for plan:", plan);
    return NextResponse.json({ error: `Invalid price ID format for "${plan}" plan. Expected "price_..." but got "${priceId.substring(0, 10)}..."` }, { status: 500 });
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || `https://${req.headers.get("host")}`;

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
    console.error("Stripe checkout error:", err.message, err.type, err.code, err.param);
    const detail = err.message || "Unknown error";
    return NextResponse.json(
      { error: `Stripe error: ${detail}` },
      { status: 500 }
    );
  }
}
