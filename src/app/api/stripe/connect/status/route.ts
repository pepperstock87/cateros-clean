import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * GET — Check whether the caterer's Connect account is fully onboarded.
 * Also syncs the onboarded status to the DB if it has changed.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_onboarded")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json({
        onboarded: false,
        accountId: null,
        status: "not_started",
      });
    }

    // Fetch the account from Stripe to check current status
    const account = await stripe.accounts.retrieve(
      profile.stripe_connect_account_id
    );

    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;
    const onboarded = chargesEnabled && payoutsEnabled && detailsSubmitted;

    // Sync onboarded status to DB if it changed
    if (onboarded !== profile.stripe_connect_onboarded) {
      await supabase
        .from("profiles")
        .update({ stripe_connect_onboarded: onboarded })
        .eq("id", user.id);
    }

    return NextResponse.json({
      onboarded,
      accountId: profile.stripe_connect_account_id,
      status: onboarded
        ? "active"
        : detailsSubmitted
        ? "pending"
        : "not_started",
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
    });
  } catch (err) {
    console.error("Connect status check error:", err);
    return NextResponse.json(
      { error: "Failed to check Connect status" },
      { status: 500 }
    );
  }
}
