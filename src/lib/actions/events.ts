"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PricingData, PaymentData } from "@/types";

export async function createEventAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status, trial_end")
    .eq("id", user.id)
    .single();

  const planTier = profile?.plan_tier || "free";
  const subscriptionStatus = profile?.subscription_status;
  
  const now = new Date();
  const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null;
  const trialExpired = trialEnd && now > trialEnd;

  if (trialExpired && subscriptionStatus !== "active") {
    return { error: "Your trial has expired. Please upgrade to continue creating events." };
  }

  if (subscriptionStatus === "past_due" || subscriptionStatus === "canceled") {
    return { error: "Your subscription is inactive. Please update your billing to continue." };
  }

  const hasActivePlan = subscriptionStatus === "active" || subscriptionStatus === "trialing" || (trialEnd && now < trialEnd);
  
  if (planTier === "free" && !hasActivePlan) {
    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (events && events.length >= 3) {
      return { error: "Free plan limit reached. You can create up to 3 events per month. Upgrade to Basic or Pro for unlimited events." };
    }
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name: formData.get("name") as string,
      client_name: formData.get("client_name") as string,
      client_email: formData.get("client_email") as string || null,
      client_phone: formData.get("client_phone") as string || null,
      event_date: formData.get("event_date") as string,
      start_time: formData.get("start_time") as string || null,
      end_time: formData.get("end_time") as string || null,
      guest_count: Number(formData.get("guest_count")),
      venue: formData.get("venue") as string || null,
      notes: formData.get("notes") as string || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  redirect(`/events/${data.id}`);
}

export async function updateEventPricingAction(eventId: string, pricingData: PricingData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .update({ pricing_data: pricingData, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function updateEventStatusAction(eventId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateEventPaymentAction(eventId: string, paymentData: PaymentData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .update({ payment_data: paymentData, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
