"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

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

export async function updateProfile(data: {
  full_name?: string;
  company_name?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, string> = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.company_name !== undefined) updates.company_name = data.company_name;

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding");
  return { success: true };
}

export async function completeOnboarding() {
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

export async function createEventOnboarding(data: {
  name: string;
  clientName: string;
  eventDate: string;
  guestCount: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();

  const { error } = await supabase.from("events").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    name: data.name,
    client_name: data.clientName,
    event_date: data.eventDate,
    guest_count: data.guestCount,
    status: "draft",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/events");
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
