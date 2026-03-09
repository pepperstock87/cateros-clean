"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get current org
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase.from("clients").insert({
    user_id: user.id,
    first_name: (formData.get("first_name") as string)?.trim() || "",
    last_name: (formData.get("last_name") as string)?.trim() || "",
    company_name: (formData.get("company_name") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    address_line1: (formData.get("address_line1") as string)?.trim() || null,
    address_line2: (formData.get("address_line2") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    state: (formData.get("state") as string)?.trim() || null,
    zip: (formData.get("zip") as string)?.trim() || null,
    tags: formData.get("tags") ? JSON.parse(formData.get("tags") as string) : [],
    dietary_notes: (formData.get("dietary_notes") as string)?.trim() || null,
    communication_preferences: (formData.get("communication_preferences") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    status: (formData.get("status") as string) || "active",
    organization_id: profile?.current_organization_id || null,
  }).select().single();

  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  return data;
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("clients").update({
    first_name: (formData.get("first_name") as string)?.trim() || "",
    last_name: (formData.get("last_name") as string)?.trim() || "",
    company_name: (formData.get("company_name") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    address_line1: (formData.get("address_line1") as string)?.trim() || null,
    address_line2: (formData.get("address_line2") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    state: (formData.get("state") as string)?.trim() || null,
    zip: (formData.get("zip") as string)?.trim() || null,
    tags: formData.get("tags") ? JSON.parse(formData.get("tags") as string) : [],
    dietary_notes: (formData.get("dietary_notes") as string)?.trim() || null,
    communication_preferences: (formData.get("communication_preferences") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    status: (formData.get("status") as string) || "active",
    updated_at: new Date().toISOString(),
  }).eq("id", clientId).eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientAction(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("clients").delete().eq("id", clientId).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/clients");
}

// Keep the existing saveClientNotes function for backward compat
export async function saveClientNotes(clientName: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();
  const orgId = profile?.current_organization_id;

  const { error } = await supabase.from("client_notes").upsert(
    {
      user_id: user.id,
      client_name: clientName,
      notes,
      organization_id: orgId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,client_name" }
  );

  if (error) return { error: error.message };
  return { success: true };
}
