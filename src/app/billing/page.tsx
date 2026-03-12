"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { CreditCard, CheckCircle, Zap, ArrowRight, X } from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const BASIC_FEATURES = [
  "Unlimited events",
  "PDF proposal generation",
  "Recipe cost library",
  "Profit dashboard",
];

const PRO_FEATURES = [
  ...BASIC_FEATURES,
  "Custom branding & logo",
  "Calendar scheduling",
  "Advanced proposal templates",
  "Priority support",
];

export default function BillingPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<"basic" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      setProfile(data);

      const isSuccess = searchParams.get("success") === "1";
      const isActive = data?.subscription_status === "active" || data?.subscription_status === "trialing";

      if (isSuccess && !isActive) {
        setSyncing(true);
        try {
          const res = await fetch("/api/stripe/sync", { method: "POST" });
          const result = await res.json();
          if (result.synced) {
            const { data: updated } = await supabase.from("profiles").select("*").maybeSingle();
            setProfile(updated);
          }
        } catch {
          // Webhook may still arrive
        } finally {
          setSyncing(false);
        }
      }
    }

    load();
  }, [searchParams]);

  const fetchClientSecret = useCallback(async () => {
    if (!checkoutPlan) throw new Error("No plan selected");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: checkoutPlan }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.clientSecret;
  }, [checkoutPlan]);

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e.message);
    }
    setPortalLoading(false);
  }

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const currentPlan = profile?.plan_tier || "basic";

  // Show embedded checkout
  if (checkoutPlan) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-semibold">
              Subscribe to {checkoutPlan === "pro" ? "Pro" : "Basic"}
            </h1>
            <p className="text-sm text-[#D4A373] mt-1">
              {checkoutPlan === "pro" ? "$149" : "$65"}/mo — 14-day free trial
            </p>
          </div>
          <button
            onClick={() => setCheckoutPlan(null)}
            className="p-2 rounded-lg hover:bg-[#1a1f2e] transition-colors text-[#7A8BA8] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#232b3e]">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-[#D4A373] mt-1">Manage your Cateros subscription</p>
        <Link
          href="/billing/plans"
          className="inline-flex items-center gap-2 mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          View Plans &amp; Compare Features
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {syncing && (
        <div className="bg-brand-900/30 border border-brand-800 text-brand-300 p-4 rounded-lg mb-6 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          Activating your subscription...
        </div>
      )}

      {searchParams.get("success") === "1" && !syncing && isActive && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Subscription activated! You now have access to all {currentPlan === "pro" ? "Pro" : "Basic"} features.
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isActive && (
        <div className="card p-7 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-green-900/40 border border-green-800/50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="font-semibold">Cateros {currentPlan === "pro" ? "Pro" : "Basic"} — Active</div>
              <div className="text-sm text-[#D4A373] capitalize">Status: {profile?.subscription_status}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {portalLoading ? "Loading..." : "Manage subscription & billing"}
            </button>
            {currentPlan === "basic" && (
              <button
                onClick={() => setCheckoutPlan("pro")}
                className="btn-primary flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Plan */}
        <div className={`card p-7 ${currentPlan === "basic" && isActive ? "border-brand-500" : ""}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="font-semibold">Basic</div>
            {currentPlan === "basic" && isActive && (
              <span className="text-xs px-2 py-1 rounded bg-brand-900 text-brand-300 border border-brand-800">Current</span>
            )}
          </div>
          <div className="font-display text-3xl font-semibold mb-1">$65<span className="text-lg text-[#D4A373] font-normal">/mo</span></div>
          <p className="text-sm text-[#D4A373] mb-5">14-day free trial</p>
          <ul className="space-y-2 mb-6">
            {BASIC_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          {!isActive && (
            <button
              onClick={() => setCheckoutPlan("basic")}
              className="btn-secondary w-full"
            >
              Start Basic Trial
            </button>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`card p-7 border-2 ${currentPlan === "pro" && isActive ? "border-brand-400" : "border-brand-800"}`}>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-brand-400" />
            <div className="font-semibold">Pro</div>
            {currentPlan === "pro" && isActive && (
              <span className="text-xs px-2 py-1 rounded bg-brand-900 text-brand-300 border border-brand-800">Current</span>
            )}
          </div>
          <div className="font-display text-3xl font-semibold mb-1 text-brand-300">$149<span className="text-lg text-[#D4A373] font-normal">/mo</span></div>
          <p className="text-sm text-[#D4A373] mb-5">14-day free trial</p>
          <ul className="space-y-2 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          {!isActive || currentPlan === "basic" ? (
            <button
              onClick={() => setCheckoutPlan("pro")}
              className="btn-primary w-full"
            >
              {currentPlan === "basic" ? "Upgrade to Pro" : "Start Pro Trial"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-center text-[#7A8BA8] mt-6">
        All plans secured by Stripe. Cancel anytime with no questions asked.
      </p>
    </div>
  );
}
