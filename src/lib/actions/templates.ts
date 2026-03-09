"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { TemplateCategory } from "@/types";

export async function createTemplate(data: {
  name: string;
  description?: string;
  category: TemplateCategory;
  template_data: Record<string, any>;
  tags?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  const { error } = await supabase.from("event_templates").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    category: data.category,
    template_data: data.template_data,
    tags: data.tags ?? [],
  });

  if (error) return { error: error.message };

  revalidatePath("/templates");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteQuery = supabase
    .from("event_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
  const { error } = await deleteQuery;

  if (error) return { error: error.message };

  revalidatePath("/templates");
  revalidatePath("/events/new");
  return { success: true };
}

export async function getTemplatesByCategory(category?: TemplateCategory) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", templates: [] };
  const org = await getCurrentOrg();

  let query = supabase.from("event_templates").select("*").eq("user_id", user.id);
  if (org?.orgId) query = query.eq("organization_id", org.orgId);
  if (category) query = query.eq("category", category);
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return { error: error.message, templates: [] };
  return { templates: data ?? [] };
}

export async function applyTemplateToEvent(templateId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  // Fetch the template
  let tplQuery = supabase
    .from("event_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", user.id);
  if (org?.orgId) tplQuery = tplQuery.eq("organization_id", org.orgId);
  const { data: template } = await tplQuery.single();
  if (!template) return { error: "Template not found" };

  const category = (template.category as TemplateCategory) ?? "pricing";
  const td = (template.template_data ?? template.pricing_data ?? {}) as Record<string, any>;

  // Apply based on category
  if (category === "menu" || category === "pricing") {
    // For menu: merge menuItems into event pricing_data
    // For pricing: replace entire pricing_data
    let eventQuery = supabase.from("events").select("pricing_data").eq("id", eventId).eq("user_id", user.id);
    if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
    const { data: event } = await eventQuery.single();
    if (!event) return { error: "Event not found" };

    let newPricing: Record<string, any>;
    if (category === "menu") {
      // Merge menu items into existing pricing
      const existing = (event.pricing_data ?? {}) as Record<string, any>;
      const existingItems = existing.menuItems ?? [];
      const templateItems = td.menuItems ?? [];
      newPricing = { ...existing, menuItems: [...existingItems, ...templateItems] };
    } else {
      // Replace entire pricing_data
      newPricing = td;
    }

    let updateQuery = supabase
      .from("events")
      .update({ pricing_data: newPricing, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("user_id", user.id);
    if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
    const { error } = await updateQuery;
    if (error) return { error: error.message };
  }

  if (category === "pack_list" || category === "full_event") {
    const packItems = td.packItems ?? [];
    if (packItems.length > 0) {
      const rows = packItems.map((item: any) => ({
        event_id: eventId,
        item_name: item.item_name,
        quantity: item.quantity ?? 1,
        category: item.category ?? "General",
        packed: false,
        notes: item.notes ?? null,
      }));
      const { error } = await supabase.from("event_pack_items").insert(rows);
      if (error) return { error: error.message };
    }
  }

  if (category === "timeline" || category === "full_event") {
    const timelineItems = td.timelineItems ?? [];
    if (timelineItems.length > 0) {
      const rows = timelineItems.map((item: any, idx: number) => ({
        event_id: eventId,
        phase: item.phase ?? "day_of",
        task: item.task,
        sort_order: item.sort_order ?? idx,
        completed: false,
        assigned_to: item.assigned_to ?? null,
        notes: item.notes ?? null,
      }));
      const { error } = await supabase.from("event_timeline_items").insert(rows);
      if (error) return { error: error.message };
    }
  }

  if (category === "full_event") {
    // Also apply pricing/menu data if present
    if (td.pricingData || td.menuItems) {
      const pricingPayload = td.pricingData ?? { menuItems: td.menuItems };
      let updateQuery = supabase
        .from("events")
        .update({ pricing_data: pricingPayload, updated_at: new Date().toISOString() })
        .eq("id", eventId)
        .eq("user_id", user.id);
      if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
      await updateQuery;
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/templates");
  return { success: true };
}

export async function fetchUserEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const org = await getCurrentOrg();

  let query = supabase
    .from("events")
    .select("id, name, event_date, client_name")
    .eq("user_id", user.id)
    .order("event_date", { ascending: false })
    .limit(50);
  if (org?.orgId) query = query.eq("organization_id", org.orgId);
  const { data } = await query;
  return data ?? [];
}
