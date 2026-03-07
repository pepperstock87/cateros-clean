"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, CheckCircle, Zap } from "lucide-react";

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
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => setProfile(data));
  }, []);

  async function handleSubscribe(plan: "basic" | "pro") {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to create checkout session");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(null);
  }

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const currentPlan = profile?.plan_tier || "basic";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-[#9c8876] mt-1">Manage your Cateros subscription</p>
      </div>

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
              <div className="text-sm text-[#9c8876] capitalize">Status: {profile?.subscription_status}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePortal} disabled={!!loading} className="btn-secondary flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Manage subscription & billing
            </button>
            {currentPlan === "basic" && (
              <button
                onClick={() => handleSubscribe("pro")}
                disabled={!!loading}
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
          <div className="font-display text-3xl font-semibold mb-1">$65<span className="text-lg text-[#9c8876] font-normal">/mo</span></div>
          <p className="text-sm text-[#9c8876] mb-5">14-day free trial</p>
          <ul className="space-y-2 mb-6">
            {BASIC_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          {!isActive && (
            <button
              onClick={() => handleSubscribe("basic")}
              disabled={!!loading}
              className="btn-secondary w-full"
            >
              {loading === "basic" ? "Loading..." : "Start Basic Trial"}
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
          <div className="font-display text-3xl font-semibold mb-1 text-brand-300">$149<span className="text-lg text-[#9c8876] font-normal">/mo</span></div>
          <p className="text-sm text-[#9c8876] mb-5">14-day free trial</p>
          <ul className="space-y-2 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          {!isActive || currentPlan === "basic" ? (
            <button
              onClick={() => handleSubscribe("pro")}
              disabled={!!loading}
              className="btn-primary w-full"
            >
              {loading === "pro" ? "Loading..." : currentPlan === "basic" ? "Upgrade to Pro" : "Start Pro Trial"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-center text-[#6b5a4a] mt-6">
        All plans secured by Stripe. Cancel anytime with no questions asked.
      </p>
    </div>
  );
}
