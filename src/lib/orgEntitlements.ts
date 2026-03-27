import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { isDemoSession } from "@/lib/demo";
import type { PlanType, OrganizationSubscription } from "@/types";

export type OrgEntitlements = {
  plan: PlanType;
  features: string[];
  isBasic: boolean;
  isPro: boolean;
  hasFeature: (key: string) => boolean;
  subscription: OrganizationSubscription | null;
};

/**
 * Get organization-level entitlements for the current user's active org.
 * Complements the existing user-level getUserEntitlements() in entitlements.ts.
 */
export async function getOrgEntitlements(): Promise<OrgEntitlements> {
  // Demo sessions always get Pro access
  const isDemo = await isDemoSession();
  if (isDemo) {
    return {
      plan: "pro",
      features: ["vendor_collaboration", "advanced_templates", "custom_branding", "calendar_scheduling"],
      isBasic: false,
      isPro: true,
      hasFeature: () => true,
      subscription: null,
    };
  }

  const org = await getCurrentOrg();

  if (!org) {
    // Fall back to user-level entitlements when no organization is set up
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        plan: "basic",
        features: [],
        isBasic: true,
        isPro: false,
        hasFeature: () => false,
        subscription: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier, subscription_status")
      .eq("id", user.id)
      .single();

    const userPlan = (profile?.plan_tier || "basic") as PlanType;
    const userStatus = profile?.subscription_status || "none";
    const userIsActive = userStatus === "active" || userStatus === "trialing";
    const effectivePlan: PlanType = userIsActive ? userPlan : "basic";

    // Fetch feature flags for this plan
    const { data: flags } = await supabase
      .from("feature_flags")
      .select("feature_key, plans")
      .eq("is_active", true);

    const features = (flags ?? [])
      .filter((f) => (f.plans as string[]).includes(effectivePlan))
      .map((f) => f.feature_key);

    return {
      plan: effectivePlan,
      features,
      isBasic: effectivePlan === "basic",
      isPro: effectivePlan === "pro",
      hasFeature: (key: string) => features.includes(key),
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

  const plan: PlanType = (sub?.plan_type as PlanType) ?? "basic";
  const isActive =
    !sub || sub.status === "active" || sub.status === "trialing";

  // Fetch enabled features for this plan
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("feature_key, plans")
    .eq("is_active", true);

  const activePlan = isActive ? plan : "basic";

  const features = (flags ?? [])
    .filter((f) => (f.plans as string[]).includes(activePlan))
    .map((f) => f.feature_key);

  return {
    plan: activePlan,
    features,
    isBasic: activePlan === "basic",
    isPro: activePlan === "pro",
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
