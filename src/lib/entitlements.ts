import { createClient } from "@/lib/supabase/server";
import type { UserEntitlements } from "@/types";

export async function getUserEntitlements(): Promise<UserEntitlements> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      plan: "basic",
      subscription_status: "none",
      isPro: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan_tier || "basic") as "basic" | "pro";
  const status = profile?.subscription_status || "none";
  const subscription_status = status as "active" | "trialing" | "past_due" | "canceled" | "none";

  const isPro = 
    plan === "pro" && 
    (subscription_status === "active" || subscription_status === "trialing");

  return {
    plan,
    subscription_status,
    isPro,
  };
}
