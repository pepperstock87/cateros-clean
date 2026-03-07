import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import type { PlanType, OrganizationSubscription } from "@/types";

export type OrgEntitlements = {
  plan: PlanType;
  features: string[];
  isStarter: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  hasFeature: (key: string) => boolean;
  subscription: OrganizationSubscription | null;
};

/**
 * Get organization-level entitlements for the current user's active org.
 * Complements the existing user-level getUserEntitlements() in entitlements.ts.
 */
export async function getOrgEntitlements(): Promise<OrgEntitlements> {
  const org = await getCurrentOrg();

  if (!org) {
    return {
      plan: "starter",
      features: [],
      isStarter: true,
      isPro: false,
      isEnterprise: false,
      hasFeature: () => false,
      subscription: null,
    };
  }

  const supabase = await createClient();

  // Fetch org subscription
  const { data: sub } = await supabase
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", org.orgId)
    .single();

  const plan: PlanType = (sub?.plan_type as PlanType) ?? "starter";
  const isActive =
    !sub || sub.status === "active" || sub.status === "trialing";

  // Fetch enabled features for this plan
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("feature_key, plans")
    .eq("is_active", true);

  const activePlan = isActive ? plan : "starter";

  const features = (flags ?? [])
    .filter((f) => (f.plans as string[]).includes(activePlan))
    .map((f) => f.feature_key);

  return {
    plan: activePlan,
    features,
    isStarter: activePlan === "starter",
    isPro: activePlan === "pro" || activePlan === "enterprise",
    isEnterprise: activePlan === "enterprise",
    hasFeature: (key: string) => features.includes(key),
    subscription: sub as OrganizationSubscription | null,
  };
}

/**
 * Check if a specific feature is available for the current org.
 * Convenience wrapper for server components and actions.
 */
export async function checkFeature(featureKey: string): Promise<boolean> {
  const { features } = await getOrgEntitlements();
  return features.includes(featureKey);
}
