"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { EventOrganization } from "@/types";

export async function addEventCollaboratorAction(data: {
  eventId: string;
  organizationId: string;
  relationshipType: string;
  isPrimary?: boolean;
  roleLabel?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const org = await getCurrentOrg();
  if (!org) return { success: false, error: "No organization context" };

  // Verify user owns the event
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", data.eventId)
    .eq("user_id", user.id)
    .single();

  if (!event) return { success: false, error: "Event not found or access denied" };

  const { error } = await supabase.from("event_organizations").insert({
    event_id: data.eventId,
    organization_id: data.organizationId,
    relationship_type: data.relationshipType,
    is_primary: data.isPrimary ?? false,
    role_label: data.roleLabel ?? null,
    contact_name: data.contactName ?? null,
    contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null,
    notes: data.notes ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${data.eventId}`);
  return { success: true };
}

export async function updateEventCollaboratorAction(
  collaboratorId: string,
  data: {
    roleLabel?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
    status?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Build update payload with only provided fields
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.roleLabel !== undefined) updatePayload.role_label = data.roleLabel;
  if (data.contactName !== undefined) updatePayload.contact_name = data.contactName;
  if (data.contactEmail !== undefined) updatePayload.contact_email = data.contactEmail;
  if (data.contactPhone !== undefined) updatePayload.contact_phone = data.contactPhone;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.status !== undefined) updatePayload.status = data.status;

  // RLS ensures only event owners can update
  const { data: updated, error } = await supabase
    .from("event_organizations")
    .update(updatePayload)
    .eq("id", collaboratorId)
    .select("event_id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${updated.event_id}`);
  return { success: true };
}

export async function removeEventCollaboratorAction(
  collaboratorId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // RLS ensures only event owners can delete
  const { error } = await supabase
    .from("event_organizations")
    .delete()
    .eq("id", collaboratorId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function getEventCollaboratorsAction(
  eventId: string
): Promise<{ data: EventOrganization[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const org = await getCurrentOrg();
  if (!org) return { data: [], error: "No organization context" };

  const { data, error } = await supabase
    .from("event_organizations")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  return { data: (data as EventOrganization[]) ?? [] };
}

export async function searchOrganizationsAction(
  query: string
): Promise<{ data: { id: string; name: string; organization_type: string }[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, organization_type")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) return { data: [], error: error.message };

  return { data: data ?? [] };
}
