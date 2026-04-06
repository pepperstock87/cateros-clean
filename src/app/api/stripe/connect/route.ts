import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * POST — Create a Stripe Connect Express account for the logged-in caterer
 * and return an Account Link URL so they can complete onboarding.
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, company_name, stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      req.headers.get("origin") ||
      `https://${host}`;

    let connectAccountId = profile.stripe_connect_account_id;

    // If the user already has a Connect account, just create a new account link
    // so they can resume or update onboarding. Otherwise create a new account.
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: {
          supabase_uid: user.id,
        },
        business_profile: {
          name: profile.company_name || profile.full_name || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      connectAccountId = account.id;

      // Store the Connect account ID on the profile
      await supabase
        .from("profiles")
        .update({
          stripe_connect_account_id: connectAccountId,
          stripe_connect_onboarded: false,
        })
        .eq("id", user.id);
    }

    // Create an Account Link for the user to complete onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${appUrl}/settings?connect=refresh`,
      return_url: `${appUrl}/settings?connect=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, accountId: connectAccountId });
  } catch (err) {
    console.error("Connect account creation error:", err);
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    );
  }
}
