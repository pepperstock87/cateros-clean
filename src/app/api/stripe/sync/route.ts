import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

/**
 * POST /api/stripe/sync
 * Called after checkout redirect to sync subscription status from Stripe.
 * Handles the case where the webhook hasn't arrived yet.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_status, plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  // Already active — nothing to sync
  if (profile.subscription_status === "active" || profile.subscription_status === "trialing") {
    return NextResponse.json({ status: profile.subscription_status, plan: profile.plan_tier });
  }

  // Fetch active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: profile.stripe_customer_id,
    status: "all",
    limit: 5,
  });

  // Find the most recent active/trialing subscription
  const activeSub = subscriptions.data.find(
    (s) => s.status === "active" || s.status === "trialing"
  );

  if (!activeSub) {
    return NextResponse.json({ status: "none", plan: null });
  }

  // Determine plan tier from price ID
  const priceId = activeSub.items.data[0]?.price.id;
  let planTier: "basic" | "pro" = "pro";
  if (process.env.STRIPE_PRICE_ID_BASIC && priceId === process.env.STRIPE_PRICE_ID_BASIC) {
    planTier = "basic";
  }

  // Update the profile
  await supabase
    .from("profiles")
    .update({
      stripe_subscription_id: activeSub.id,
      subscription_status: activeSub.status,
      plan_tier: planTier,
      trial_end: activeSub.trial_end
        ? new Date(activeSub.trial_end * 1000).toISOString()
        : null,
    })
    .eq("id", user.id);

  return NextResponse.json({ status: activeSub.status, plan: planTier, synced: true });
}
