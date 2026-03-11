import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CainPageClient } from "./CainPageClient";

export default async function CainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status")
    .eq("id", user.id)
    .single();

  const isPro =
    profile?.plan_tier === "pro" &&
    (profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing");

  if (!isPro) {
    redirect("/billing?upgrade=pro&feature=cain");
  }

  return <CainPageClient />;
}
