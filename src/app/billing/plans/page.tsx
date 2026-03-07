import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getOrgEntitlements } from "@/lib/orgEntitlements";
import { Check, X, Zap, Crown, Building2 } from "lucide-react";
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
  starter: {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Get started with essential catering management tools.",
    icon: Building2,
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
  enterprise: {
    name: "Enterprise",
    price: "$349",
    period: "/mo",
    description: "Full platform access for large-scale operations.",
    icon: Crown,
    highlight: false,
  },
};

const PLAN_ORDER: PlanType[] = ["starter", "pro", "enterprise"];

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

  // Starter always includes some base features
  const starterFeatures = [
    "Up to 3 team members",
    "Up to 25 events/month",
    "Basic recipe library",
    "Simple proposals",
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-semibold mb-2">
          Choose Your Plan
        </h1>
        <p className="text-[#9c8876] max-w-xl mx-auto">
          Scale your catering business with the right tools. All plans include a
          14-day free trial.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {PLAN_ORDER.map((planKey) => {
          const detail = PLAN_DETAILS[planKey];
          const Icon = detail.icon;
          const isCurrent = currentPlan === planKey;
          const isUpgrade =
            PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(currentPlan);
          const isDowngrade =
            PLAN_ORDER.indexOf(planKey) < PLAN_ORDER.indexOf(currentPlan);

          return (
            <div
              key={planKey}
              className={`card p-7 flex flex-col ${
                detail.highlight
                  ? "border-2 border-brand-500 relative"
                  : ""
              } ${isCurrent ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-[#0f0d0b]" : ""}`}
            >
              {detail.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-[#0f0d0b] text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    detail.highlight
                      ? "bg-brand-900/60 border border-brand-700"
                      : "bg-[#1c1814] border border-[#2e271f]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      detail.highlight ? "text-brand-400" : "text-[#9c8876]"
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
                {detail.period && (
                  <span className="text-[#9c8876] text-lg">
                    {detail.period}
                  </span>
                )}
              </div>

              <p className="text-sm text-[#9c8876] mb-5">
                {detail.description}
              </p>

              {/* Feature list for this plan */}
              <div className="flex-1">
                <ul className="space-y-2 mb-6">
                  {planKey === "starter" &&
                    starterFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  {featureFlags.map((flag) => {
                    const included = flag.plans.includes(planKey);
                    return (
                      <li
                        key={flag.id}
                        className={`flex items-center gap-2 text-sm ${
                          !included ? "text-[#6b5a4a]" : ""
                        }`}
                      >
                        {included ? (
                          <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-[#3d3429] flex-shrink-0" />
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
              ) : isDowngrade ? (
                <Link
                  href="/billing"
                  className="btn-secondary w-full text-center text-[#9c8876]"
                >
                  Downgrade
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-[#2e271f]">
          <h2 className="font-display text-lg font-semibold">
            Feature Comparison
          </h2>
          <p className="text-sm text-[#9c8876] mt-1">
            Detailed breakdown of what each plan includes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e271f]">
                <th className="text-left text-sm font-medium text-[#9c8876] p-4 w-[40%]">
                  Feature
                </th>
                {PLAN_ORDER.map((p) => (
                  <th
                    key={p}
                    className={`text-center text-sm font-medium p-4 w-[20%] ${
                      currentPlan === p ? "text-brand-400" : "text-[#9c8876]"
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
              {featureFlags.map((flag, i) => (
                <tr
                  key={flag.id}
                  className={
                    i < featureFlags.length - 1
                      ? "border-b border-[#1c1814]"
                      : ""
                  }
                >
                  <td className="p-4">
                    <div className="text-sm font-medium">
                      {flag.feature_name}
                    </div>
                    {flag.description && (
                      <div className="text-xs text-[#6b5a4a] mt-0.5">
                        {flag.description}
                      </div>
                    )}
                  </td>
                  {PLAN_ORDER.map((p) => (
                    <td key={p} className="p-4 text-center">
                      {flag.plans.includes(p) ? (
                        <Check className="w-5 h-5 text-brand-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-[#3d3429] mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-center text-[#6b5a4a] mt-6">
        All plans secured by Stripe. Cancel anytime with no questions asked.
      </p>
    </div>
  );
}
