"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BusinessSettings } from "@/types";
import { getUserEntitlements } from "@/lib/entitlements";

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function updateBusinessSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entitlements = await getUserEntitlements();
  if (!entitlements.isPro) {
    return { error: "Pro plan required for custom branding" };
  }

  const settings = {
    user_id: user.id,
    business_name: formData.get("business_name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    proposal_terms: formData.get("proposal_terms") as string,
    proposal_template: (formData.get("proposal_template") as string) || "simple",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("business_settings")
    .upsert(settings, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function uploadLogo(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entitlements = await getUserEntitlements();
  if (!entitlements.isPro) {
    return { error: "Pro plan required for custom branding" };
  }

  const file = formData.get("logo") as File;
  if (!file) return { error: "No file provided" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/logo.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(fileName, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("logos").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("business_settings")
    .upsert({ user_id: user.id, logo_url: data.publicUrl, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (updateError) return { error: updateError.message };

  revalidatePath("/settings");
  return { success: true, logo_url: data.publicUrl };
}
