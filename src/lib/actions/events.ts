"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PricingData, PaymentData } from "@/types";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";
import { getCurrentOrg } from "@/lib/organizations";
import { domainEvents, registerDomainEventHandlers } from "@/lib/events";
import { generateProduction } from "@/lib/actions/production";
import { validateEventFormData } from "@/lib/validations";

registerDomainEventHandlers();

export async function createEventAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const validated = validateEventFormData(formData);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Invalid input" };
  }
  const v = validated.data;

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: v.name,
      client_name: v.client_name,
      client_email: v.client_email || null,
      client_phone: v.client_phone || null,
      client_id: v.client_id || null,
      event_date: v.event_date,
      start_time: v.start_time || null,
      end_time: v.end_time || null,
      guest_count: v.guest_count,
      venue: v.venue || null,
      notes: v.notes || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(data.id, user.id, "event_created", `Event "${data.name}" created`, {
    client: data.client_name,
    guest_count: data.guest_count,
  });

  // Fire-and-forget audit log
  logAudit({
    userId: user.id,
    action: "create",
    entity: "event",
    entityId: data.id,
    entityName: data.name,
    details: { client: data.client_name, guest_count: data.guest_count },
    organizationId: org?.orgId || null,
  });

  // Auto-create client if client_email is provided and doesn't exist
  if (data.client_email) {
    try {
      // Check if client with this email already exists
      const { data: existingClient, error: checkError } = await supabase
        .from("clients")
        .select("id")
        .eq("email", data.client_email)
        .eq("user_id", user.id)
        .single();

      // If no client exists with this email, create one
      if (checkError && checkError.code === "PGRST116") {
        // Parse client_name into first_name and last_name if available
        const nameParts = (data.client_name || "").trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ");

        const { error: createClientError } = await supabase
          .from("clients")
          .insert({
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: data.client_email,
            phone: data.client_phone || null,
            organization_id: org?.orgId || null,
            status: "active",
          });

        if (createClientError) {
          console.error("[events] Auto-create client failed:", createClientError.message);
        }
      }
    } catch (err) {
      // Non-blocking — event was already created
      console.error("[events] Auto-create client error:", err instanceof Error ? err.message : err);
    }
  }

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

  const validated = validateEventFormData(formData);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Invalid input" };
  }
  const v = validated.data;

  let updateQuery = supabase
    .from("events")
    .update({
      name: v.name,
      client_name: v.client_name,
      client_email: v.client_email || null,
      client_phone: v.client_phone || null,
      client_id: v.client_id || null,
      event_date: v.event_date,
      start_time: v.start_time || null,
      end_time: v.end_time || null,
      guest_count: v.guest_count,
      venue: v.venue || null,
      notes: v.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
  const { error } = await updateQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "event_updated", "Event details updated", {
    name: v.name,
    guest_count: v.guest_count,
    venue: v.venue || null,
  });

  logAudit({
    userId: user.id,
    action: "update",
    entity: "event",
    entityId: eventId,
    entityName: v.name,
    details: { guest_count: v.guest_count, venue: v.venue || null },
    organizationId: org?.orgId || null,
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function updateEventPricingAction(eventId: string, pricingData: PricingData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Fetch current event to check status and detect menu changes
  let fetchQuery = supabase
    .from("events")
    .select("status, pricing_data")
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) fetchQuery = fetchQuery.eq("organization_id", org.orgId);
  const { data: currentEvent } = await fetchQuery.single();

  let pricingQuery = supabase
    .from("events")
    .update({ pricing_data: pricingData, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) pricingQuery = pricingQuery.eq("organization_id", org.orgId);
  const { error } = await pricingQuery;

  if (error) return { error: error.message };

  await logActivity(eventId, user.id, "pricing_update", "Pricing updated");

  // Auto-regenerate production (shopping list + prep) when menu changes on confirmed events
  if (currentEvent?.status === "confirmed") {
    const oldMenu = (currentEvent.pricing_data as Record<string, unknown> | null)?.menuItems;
    const newMenu = (pricingData as Record<string, unknown>)?.menuItems;
    const menuChanged = JSON.stringify(oldMenu) !== JSON.stringify(newMenu);

    if (menuChanged) {
      try {
        await generateProduction(eventId);
      } catch (err) {
        // Non-blocking — pricing was already saved
        console.error("[events] Auto-regenerate production on menu change failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function updateEventStatusAction(eventId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Fetch current status before updating
  const { data: currentEvent, error: fetchError } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    console.error("Failed to fetch event for status update:", fetchError.message);
  }

  const fromStatus = currentEvent?.status || "unknown";

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

  // Emit domain event
  await domainEvents.emit(
    "event.status_changed",
    {
      eventId,
      userId: user.id,
      orgId: org?.orgId || null,
      fromStatus,
      toStatus: status,
    },
    "actions/events"
  );

  // Auto-generate production sheets when event is confirmed
  if (status === "confirmed" && fromStatus !== "confirmed") {
    try {
      await generateProduction(eventId);
    } catch (err) {
      // Non-blocking — event status was already updated
      console.error("[events] Auto-generate production on confirm failed:", err instanceof Error ? err.message : err);
    }
  }

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
  const { data: original, error: dupError } = await dupQuery.single();

  if (dupError || !original) return { error: dupError?.message || "Event not found" };

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
    name: templateName.trim(),
    guest_count: event.guest_count,
    pricing_data: event.pricing_data,
  });

  if (error) return { error: error.message };
  revalidatePath("/events/new");
  return { success: true };
}

export async function cloneEventAction(eventId: string, overrides?: {
  name?: string;
  event_date?: string;
  client_name?: string;
  client_id?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let fetchQuery = supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (org?.orgId) fetchQuery = fetchQuery.eq("organization_id", org.orgId);
  const { data: original } = await fetchQuery.single();

  if (!original) return { error: "Event not found" };

  const { data: newEvent, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: overrides?.name || `Copy of ${original.name}`,
      client_name: overrides?.client_name || original.client_name,
      client_email: original.client_email,
      client_phone: original.client_phone,
      client_id: overrides?.client_id ?? original.client_id,
      event_date: overrides?.event_date || original.event_date,
      start_time: original.start_time,
      end_time: original.end_time,
      guest_count: original.guest_count,
      venue: original.venue,
      notes: original.notes,
      status: "draft",
      pricing_data: original.pricing_data,
      payment_data: null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(newEvent.id, user.id, "event_created", `Cloned from "${original.name}"`, {
    source_event_id: eventId,
  });

  logAudit({
    userId: user.id,
    action: "clone",
    entity: "event",
    entityId: newEvent.id,
    entityName: newEvent.name,
    details: { source_event_id: eventId, source_event_name: original.name },
    organizationId: org?.orgId || null,
  });

  revalidatePath("/events");
  return { success: true, eventId: newEvent.id };
}

export async function createRecurringEvents(sourceEventId: string, config: {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  count: number;
  startDate: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let fetchQuery = supabase
    .from("events")
    .select("*")
    .eq("id", sourceEventId)
    .eq("user_id", user.id);
  if (org?.orgId) fetchQuery = fetchQuery.eq("organization_id", org.orgId);
  const { data: original } = await fetchQuery.single();

  if (!original) return { error: "Event not found" };

  const dates: string[] = [];
  const start = new Date(config.startDate + "T00:00:00");

  for (let i = 0; i < config.count; i++) {
    const d = new Date(start);
    if (config.frequency === "weekly") {
      d.setDate(start.getDate() + i * 7);
    } else if (config.frequency === "biweekly") {
      d.setDate(start.getDate() + i * 14);
    } else {
      d.setMonth(start.getMonth() + i);
    }
    dates.push(d.toISOString().split("T")[0]);
  }

  const newEventIds: string[] = [];

  for (const date of dates) {
    const { data: newEvent, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        organization_id: org?.orgId || null,
        name: `${original.name} — ${date}`,
        client_name: original.client_name,
        client_email: original.client_email,
        client_phone: original.client_phone,
        client_id: original.client_id,
        event_date: date,
        start_time: original.start_time,
        end_time: original.end_time,
        guest_count: original.guest_count,
        venue: original.venue,
        notes: original.notes,
        status: "draft",
        pricing_data: original.pricing_data,
        payment_data: null,
      })
      .select()
      .single();

    if (error) return { error: error.message, createdSoFar: newEventIds };

    await logActivity(newEvent.id, user.id, "event_created", `Recurring event from "${original.name}"`, {
      source_event_id: sourceEventId,
      frequency: config.frequency,
    });

    newEventIds.push(newEvent.id);
  }

  revalidatePath("/events");
  return { success: true, eventIds: newEventIds };
}

/**
 * Suggest baseline pricing from similar past events.
 * Finds completed/confirmed events with similar guest count and event type,
 * then returns average per-guest pricing as a suggestion.
 */
export async function suggestBaselinePricing(params: {
  guestCount: number;
  eventType?: string;
  venue?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  // Find similar past events (within 50% guest count range)
  const minGuests = Math.floor(params.guestCount * 0.5);
  const maxGuests = Math.ceil(params.guestCount * 1.5);

  let query = supabase
    .from("events")
    .select("id, name, guest_count, pricing_data, event_date, venue, status")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "completed"])
    .gte("guest_count", minGuests)
    .lte("guest_count", maxGuests)
    .not("pricing_data", "is", null)
    .order("event_date", { ascending: false })
    .limit(10);

  if (org?.orgId) query = query.eq("organization_id", org.orgId);

  const { data: events, error } = await query;
  if (error || !events?.length) return { suggestions: null, pastEvents: [] };

  // Calculate averages from past events
  const validEvents = events.filter((e) => {
    const pd = e.pricing_data as Record<string, unknown> | null;
    return pd && typeof pd === "object" && "suggestedPrice" in pd;
  });

  if (!validEvents.length) return { suggestions: null, pastEvents: [] };

  let totalPerGuest = 0;
  let totalFoodCostPerGuest = 0;
  let foodCostCount = 0;
  const pastEventSummaries: Array<{
    id: string;
    name: string;
    guestCount: number;
    perGuest: number;
    date: string;
  }> = [];

  for (const evt of validEvents) {
    const pd = evt.pricing_data as Record<string, unknown>;
    const suggestedPrice = Number(pd.suggestedPrice) || 0;
    const guests = evt.guest_count || params.guestCount;
    const perGuest = suggestedPrice / guests;
    totalPerGuest += perGuest;

    // Extract food cost if available
    const menuItems = pd.menuItems as Array<{ costPerPerson?: number }> | undefined;
    if (menuItems?.length) {
      const foodCost = menuItems.reduce((sum, item) => sum + (Number(item.costPerPerson) || 0), 0);
      totalFoodCostPerGuest += foodCost;
      foodCostCount++;
    }

    pastEventSummaries.push({
      id: evt.id,
      name: evt.name,
      guestCount: guests,
      perGuest: Math.round(perGuest * 100) / 100,
      date: evt.event_date,
    });
  }

  const avgPerGuest = Math.round((totalPerGuest / validEvents.length) * 100) / 100;
  const avgFoodCostPerGuest = foodCostCount > 0
    ? Math.round((totalFoodCostPerGuest / foodCostCount) * 100) / 100
    : null;

  return {
    suggestions: {
      avgPerGuest,
      avgFoodCostPerGuest,
      suggestedTotal: Math.round(avgPerGuest * params.guestCount * 100) / 100,
      basedOnCount: validEvents.length,
      guestRange: { min: minGuests, max: maxGuests },
    },
    pastEvents: pastEventSummaries,
  };
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
