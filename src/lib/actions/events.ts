"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PricingData, PaymentData } from "@/types";
import { logActivity } from "@/lib/activity";
import { getCurrentOrg } from "@/lib/organizations";

export async function createEventAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
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

  await logActivity(data.id, user.id, "event_created", `Event "${data.name}" created`, {
    client: data.client_name,
    guest_count: data.guest_count,
  });

  // If a template was selected, apply its pricing_data to the new event
  const templateId = formData.get("template_id") as string;
  if (templateId && data) {
    let templateQuery = supabase
      .from("event_templates")
      .select("pricing_data")
      .eq("id", templateId)
      .eq("user_id", user.id);
    if (org?.orgId) templateQuery = templateQuery.eq("organization_id", org.orgId);
    const { data: template } = await templateQuery.single();
    if (template?.pricing_data) {
      await supabase
        .from("events")
        .update({ pricing_data: template.pricing_data })
        .eq("id", data.id);
    }
  }

  redirect(`/events/${data.id}`);
}

export async function updateEventDetailsAction(eventId: string, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let updateQuery = supabase
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
  if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
  const { error } = await updateQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "event_updated", "Event details updated", {
    name: formData.get("name") as string,
    guest_count: Number(formData.get("guest_count")),
    venue: formData.get("venue") as string || null,
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function updateEventPricingAction(eventId: string, pricingData: PricingData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let pricingQuery = supabase
    .from("events")
    .update({ pricing_data: pricingData, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) pricingQuery = pricingQuery.eq("organization_id", org.orgId);
  const { error } = await pricingQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "pricing_update", "Pricing updated");

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function updateEventStatusAction(eventId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let statusQuery = supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) statusQuery = statusQuery.eq("organization_id", org.orgId);
  const { error } = await statusQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "status_change", `Status changed to "${status}"`, {
    new_status: status,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  return { success: true };
}

export async function updateEventPaymentAction(eventId: string, paymentData: PaymentData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let paymentQuery = supabase
    .from("events")
    .update({ payment_data: paymentData, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) paymentQuery = paymentQuery.eq("organization_id", org.orgId);
  const { error } = await paymentQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "payment_added", "Payment information updated");

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function duplicateEventAction(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();

  let dupQuery = supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) dupQuery = dupQuery.eq("organization_id", org.orgId);
  const { data: original } = await dupQuery.single();

  if (!original) return { error: "Event not found" };

  const { data: newEvent, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: `${original.name} (Copy)`,
      client_name: original.client_name,
      client_email: original.client_email,
      client_phone: original.client_phone,
      event_date: original.event_date,
      start_time: original.start_time,
      end_time: original.end_time,
      guest_count: original.guest_count,
      venue: original.venue,
      notes: original.notes,
      status: "draft",
      pricing_data: original.pricing_data,
      payment_data: null, // Don't copy payment data
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/events");
  return { success: true, eventId: newEvent.id };
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteQuery = supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
  const { error } = await deleteQuery;

  if (error) return { error: error.message };
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveAsTemplateAction(eventId: string, templateName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();

  let eventQuery = supabase
    .from("events")
    .select("pricing_data, guest_count")
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
  const { data: event } = await eventQuery.single();

  if (!event || !event.pricing_data) return { error: "Event has no pricing data" };

  const { error } = await supabase.from("event_templates").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    name: templateName,
    guest_count: event.guest_count,
    pricing_data: event.pricing_data,
  });

  if (error) return { error: error.message };
  revalidatePath("/events/new");
  return { success: true };
}

export async function deleteTemplateAction(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let delTplQuery = supabase
    .from("event_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);
  if (org?.orgId) delTplQuery = delTplQuery.eq("organization_id", org.orgId);
  const { error } = await delTplQuery;

  if (error) return { error: error.message };
  return { success: true };
}
