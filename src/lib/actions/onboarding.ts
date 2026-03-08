"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

// NOTE: Migration needed — add `onboarding_completed boolean default false` to the profiles table:
// ALTER TABLE profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

export async function dismissWelcomeAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ has_seen_welcome: true })
    .eq("id", user.id);
}

type OnboardingData = {
  fullName: string;
  companyName: string;
  businessType: string;
  event?: {
    name: string;
    date: string;
    guestCount: number;
  } | null;
};

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Update profile with onboarding data
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      company_name: data.companyName,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  // Update organization type if user has an org
  const org = await getCurrentOrg();
  if (org?.orgId) {
    const orgTypeMap: Record<string, string> = {
      caterer: "caterer",
      venue: "venue",
      planner: "planner",
      multi: "caterer",
    };
    await supabase
      .from("organizations")
      .update({
        name: data.companyName,
        organization_type: orgTypeMap[data.businessType] || "caterer",
      })
      .eq("id", org.orgId);
  }

  // Create sample event if provided
  if (data.event) {
    await supabase.from("events").insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: data.event.name,
      client_name: "Sample Client",
      event_date: data.event.date,
      guest_count: data.event.guestCount,
      status: "draft",
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function skipOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
