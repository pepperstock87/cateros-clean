"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PricingData, PaymentData } from "@/types";

export async function createEventAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

export async function updateEventDetailsAction(eventId: string, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
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
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true };
}
