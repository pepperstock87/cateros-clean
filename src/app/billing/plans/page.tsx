import { createClient } from "@/lib/supabase/server";
import { getOrgEntitlements } from "@/lib/orgEntitlements";
import { Check, X, Zap, CreditCard } from "lucide-react";
import Link from "next/link";
import type { PlanType, FeatureFlag } from "@/types";

const PLAN_DETAILS: Record<
  PlanType,
  {
    name: string;
    price: string;
    period: string;
    description: string;
    icon: typeof Zap;
    highlight: boolean;
  }
> = {
  basic: {
    name: "Basic",
    price: "$65",
    period: "/mo",
    description: "Essential tools for managing your catering business.",
    icon: CreditCard,
    highlight: false,
  },
  pro: {
    name: "Pro",
    price: "$149",
    period: "/mo",
    description: "Advanced tools for growing catering businesses.",
    icon: Zap,
    highlight: true,
  },
};

const PLAN_ORDER: PlanType[] = ["basic", "pro"];

export default async function PlansPage() {
  const supabase = await createClient();
  const entitlements = await getOrgEntitlements();
  const currentPlan = entitlements.plan;

  // Fetch all feature flags
  const { data: features } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const featureFlags: FeatureFlag[] = (features ?? []) as FeatureFlag[];

  const basicFeatures = [
    "Unlimited events",
    "PDF proposal generation",
    "Recipe cost library",
    "Profit dashboard",
  ];

  const proFeatures = [
    "Everything in Basic, plus:",
    "Staff scheduling & payroll",
    "Venue & vendor coordination",
    "Custom branded proposals",
    "Production sheets (BEO)",
    "AI business assistant (C.A.I.N)",
    "Advanced analytics",
    "Team collaboration",
    "Priority support & onboarding",
  ];

  // Hardcoded comparison rows as fallback when feature_flags table is empty
  const comparisonFeatures = [
    { name: "Unlimited events", basic: true, pro: true },
    { name: "PDF proposal generation", basic: true, pro: true },
    { name: "Recipe cost library", basic: true, pro: true },
    { name: "Profit dashboard", basic: true, pro: true },
    { name: "Client portal", basic: true, pro: true },
    { name: "Email support", basic: true, pro: true },
    { name: "Staff scheduling & payroll", basic: false, pro: true },
    { name: "Venue & vendor coordination", basic: false, pro: true },
    { name: "Custom branded proposals", basic: false, pro: true },
    { name: "Production sheets (BEO)", basic: false, pro: true },
    { name: "AI business assistant (C.A.I.N)", basic: false, pro: true },
    { name: "Advanced analytics", basic: false, pro: true },
    { name: "Team collaboration", basic: false, pro: true },
    { name: "Priority support & onboarding", basic: false, pro: true },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-semibold mb-2">
          Choose Your Plan
        </h1>
        <p className="text-[#D4A373] max-w-xl mx-auto">
          Scale your catering business with the right tools. All plans include a
          14-day free trial.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {PLAN_ORDER.map((planKey) => {
          const detail = PLAN_DETAILS[planKey];
          const Icon = detail.icon;
          const isCurrent = currentPlan === planKey;
          const isUpgrade =
            PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(currentPlan);

          return (
            <div
              key={planKey}
              className={`card p-7 flex flex-col ${
                detail.highlight
                  ? "border-2 border-brand-500 relative"
                  : ""
              } ${isCurrent ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-[#0C1220]" : ""}`}
            >
              {detail.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-[#0C1220] text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    detail.highlight
                      ? "bg-brand-900/60 border border-brand-700"
                      : "bg-[#1A2538] border border-[#2A3A5C]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      detail.highlight ? "text-brand-400" : "text-[#D4A373]"
                    }`}
                  />
                </div>
                <div>
                  <div className="font-semibold text-lg">{detail.name}</div>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-900 text-brand-300 border border-brand-800">
                      Current Plan
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <span
                  className={`font-display text-3xl font-semibold ${
                    detail.highlight ? "text-brand-300" : ""
                  }`}
                >
                  {detail.price}
                </span>
                <span className="text-[#D4A373] text-lg">
                  {detail.period}
                </span>
              </div>

              <p className="text-sm text-[#D4A373] mb-5">
                {detail.description}
              </p>

              {/* Feature list */}
              <div className="flex-1">
                <ul className="space-y-2 mb-6">
                  {planKey === "basic" &&
                    basicFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  {planKey === "pro" &&
                    proFeatures.map((f, i) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${i === 0 ? "text-[#D4A373] font-medium" : ""}`}>
                        {i > 0 && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                        {f}
                      </li>
                    ))}
                  {featureFlags.map((flag) => {
                    const included = flag.plans.includes(planKey);
                    return (
                      <li
                        key={flag.id}
                        className={`flex items-center gap-2 text-sm ${
                          !included ? "text-[#7A8BA8]" : ""
                        }`}
                      >
                        {included ? (
                          <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-[#344570] flex-shrink-0" />
                        )}
                        {flag.feature_name}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Action button */}
              {isCurrent ? (
                <Link
                  href="/billing"
                  className="btn-secondary w-full text-center"
                >
                  Manage Subscription
                </Link>
              ) : isUpgrade ? (
                <Link
                  href={`/billing?upgrade=${planKey}`}
                  className="btn-primary w-full text-center flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Upgrade to {detail.name}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-[#2A3A5C]">
          <h2 className="font-display text-lg font-semibold">
            Feature Comparison
          </h2>
          <p className="text-sm text-[#D4A373] mt-1">
            Detailed breakdown of what each plan includes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3A5C]">
                <th className="text-left text-sm font-medium text-[#D4A373] p-4 w-[50%]">
                  Feature
                </th>
                {PLAN_ORDER.map((p) => (
                  <th
                    key={p}
                    className={`text-center text-sm font-medium p-4 w-[25%] ${
                      currentPlan === p ? "text-brand-400" : "text-[#D4A373]"
                    }`}
                  >
                    {PLAN_DETAILS[p].name}
                    {currentPlan === p && (
                      <span className="block text-xs text-brand-500 mt-0.5">
                        (Current)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureFlags.length > 0
                ? featureFlags.map((flag, i) => (
                    <tr
                      key={flag.id}
                      className={
                        i < featureFlags.length - 1
                          ? "border-b border-[#1A2538]"
                          : ""
                      }
                    >
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {flag.feature_name}
                        </div>
                        {flag.description && (
                          <div className="text-xs text-[#7A8BA8] mt-0.5">
                            {flag.description}
                          </div>
                        )}
                      </td>
                      {PLAN_ORDER.map((p) => (
                        <td key={p} className="p-4 text-center">
                          {flag.plans.includes(p) ? (
                            <Check className="w-5 h-5 text-brand-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-[#344570] mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                : comparisonFeatures.map((feat, i) => (
                    <tr
                      key={feat.name}
                      className={
                        i < comparisonFeatures.length - 1
                          ? "border-b border-[#1A2538]"
                          : ""
                      }
                    >
                      <td className="p-4">
                        <div className="text-sm font-medium">{feat.name}</div>
                      </td>
                      <td className="p-4 text-center">
                        {feat.basic ? (
                          <Check className="w-5 h-5 text-brand-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-[#344570] mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feat.pro ? (
                          <Check className="w-5 h-5 text-brand-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-[#344570] mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-center text-[#7A8BA8] mt-6">
        All plans secured by Stripe. Cancel anytime with no questions asked.
      </p>
    </div>
  );
}
