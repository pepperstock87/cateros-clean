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

  const priceId = plan === "basic" 
    ? process.env.STRIPE_PRICE_ID_BASIC || process.env.STRIPE_PRICE_ID_MONTHLY 
    : process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID_MONTHLY;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
    return NextResponse.json({ error: "You already have an active subscription.", redirectTo: "/billing" }, { status: 400 });
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_uid: user.id } });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
    client_reference_id: user.id,
    subscription_data: { trial_period_days: 14 },
  });

  return NextResponse.json({ url: session.url });
}
