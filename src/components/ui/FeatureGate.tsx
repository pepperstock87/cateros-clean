"use client";

import Link from "next/link";
import { Lock, Zap } from "lucide-react";
import type { PlanType } from "@/types";

// Plan hierarchy for comparison
const PLAN_RANK: Record<PlanType, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
};

// Human-friendly plan info
const PLAN_INFO: Record<PlanType, { label: string; price: string }> = {
  starter: { label: "Starter", price: "Free" },
  pro: { label: "Pro", price: "$149/mo" },
  enterprise: { label: "Enterprise", price: "$349/mo" },
};

type FeatureGateProps = {
  /** The feature key to check access for */
  feature: string;
  /** The current org plan */
  plan: PlanType;
  /** Plans that include this feature (from feature_flags.plans) */
  requiredPlans?: PlanType[];
  /** Content to render when feature is available */
  children: React.ReactNode;
  /** Custom fallback when feature is not available */
  fallback?: React.ReactNode;
};

/**
 * Conditionally renders children based on whether the current org plan
 * has access to a given feature. Shows an upgrade prompt if not.
 */
export function FeatureGate({
  feature,
  plan,
  requiredPlans,
  children,
  fallback,
}: FeatureGateProps) {
  // If requiredPlans provided, check if current plan is included
  // Otherwise, just check plan rank (pro and enterprise get most features)
  const hasAccess = requiredPlans
    ? requiredPlans.includes(plan)
    : PLAN_RANK[plan] >= PLAN_RANK.pro;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Find the minimum plan needed
  const minPlan = requiredPlans
    ? requiredPlans.reduce<PlanType>((min, p) =>
        PLAN_RANK[p] < PLAN_RANK[min] ? p : min,
      requiredPlans[0])
    : "pro";

  const { label, price } = PLAN_INFO[minPlan];

  return (
    <div className="card p-8 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-brand-400" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-2">
        {feature
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())}
      </h3>
      <p className="text-sm text-[#9c8876] mb-5">
        This feature requires the <span className="text-[#f5ede0] font-medium">{label}</span> plan or higher.
      </p>
      <Link
        href="/billing/plans"
        className="btn-primary inline-flex items-center gap-2 px-6"
      >
        <Zap className="w-4 h-4" />
        Upgrade to {label} ({price})
      </Link>
    </div>
  );
}

/**
 * Inline variant for embedding in existing UI sections.
 */
export function FeatureGateInline({
  feature,
  plan,
  requiredPlans,
  children,
}: Omit<FeatureGateProps, "fallback">) {
  const hasAccess = requiredPlans
    ? requiredPlans.includes(plan)
    : PLAN_RANK[plan] >= PLAN_RANK.pro;

  if (hasAccess) {
    return <>{children}</>;
  }

  const minPlan = requiredPlans
    ? requiredPlans.reduce<PlanType>((min, p) =>
        PLAN_RANK[p] < PLAN_RANK[min] ? p : min,
      requiredPlans[0])
    : "pro";

  return (
    <div className="bg-brand-950 border border-brand-800 rounded-lg p-4 flex items-start gap-3">
      <Lock className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#f5ede0] mb-1">
          {feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} requires a {PLAN_INFO[minPlan].label} plan.
        </p>
        <Link
          href="/billing/plans"
          className="text-sm text-brand-400 hover:text-brand-300 font-medium"
        >
          View plans &rarr;
        </Link>
      </div>
    </div>
  );
}
