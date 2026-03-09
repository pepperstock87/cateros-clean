import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <OnboardingClient
      initialFullName={profile?.full_name ?? ""}
      initialCompanyName={profile?.company_name ?? ""}
    />
  );
}
