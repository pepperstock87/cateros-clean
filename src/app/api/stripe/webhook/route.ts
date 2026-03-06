import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
      const planTier = priceId === process.env.STRIPE_PRICE_ID_BASIC ? "basic" : "pro";
      
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
  }

  return NextResponse.json({ received: true });
}
