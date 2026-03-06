"use client";

import { useState } from "react";
import { ChefHat, Check, Loader2 } from "lucide-react";

const plans = [
  {
    name: "Basic",
    price: 65,
    plan: "basic",
    features: [
      "Event Management",
      "Recipe Management",
      "Proposal Generation",
      "Schedule View",
    ],
  },
  {
    name: "Pro",
    price: 149,
    plan: "pro",
    popular: true,
    features: [
      "Everything in Basic",
      "Custom Branding",
      "BEO Sheets",
      "AI Assistant",
      "Spending Tracker",
      "Priority Support",
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0d0b] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-[#f5ede0]">Cateros</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-[#f5ede0] mb-3">
          Choose your plan
        </h1>
        <p className="text-[#9c8876] text-sm max-w-md mx-auto">
          Start with a 14-day free trial. No credit card required upfront. Cancel anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        {plans.map((p) => (
          <div
            key={p.plan}
            className={`card p-6 relative ${
              p.popular ? "ring-2 ring-brand-500" : ""
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h2 className="font-display text-xl font-semibold text-[#f5ede0] mb-1">
              {p.name}
            </h2>
            <div className="mb-5">
              <span className="text-3xl font-semibold text-[#f5ede0]">${p.price}</span>
              <span className="text-[#9c8876] text-sm">/mo</span>
            </div>
            <ul className="space-y-3 mb-6">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#f5ede0]">
                  <Check className="w-4 h-4 text-brand-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(p.plan)}
              disabled={loading !== null}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading === p.plan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Start 14-day trial"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
