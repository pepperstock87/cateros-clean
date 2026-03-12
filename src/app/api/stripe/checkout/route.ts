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
    return NextResponse.json({ error: `No Stripe price configured for "${plan}" plan.` }, { status: 500 });
  }

  if (!priceId.startsWith("price_")) {
    return NextResponse.json({ error: `Invalid price ID format for "${plan}" plan.` }, { status: 500 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
    return NextResponse.json({ error: "You already have an active subscription." }, { status: 400 });
  }

  try {
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_uid: user.id } });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const host = req.headers.get("host") || "cateros.com";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.headers.get("origin") || `https://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "embedded",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: user.id,
      subscription_data: { trial_period_days: 14 },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
