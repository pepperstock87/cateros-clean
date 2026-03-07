"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { VendorProfile, VendorCategory } from "@/types";

export async function getVendorProfileAction(): Promise<{
  data: VendorProfile | null;
  error: string | null;
}> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("*")
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VendorProfile | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to fetch vendor profile" };
  }
}

export async function upsertVendorProfileAction(data: {
  business_name: string;
  category: VendorCategory;
  description?: string;
  city?: string;
  state?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  specialties?: string[];
  service_area?: string;
}): Promise<{ data: VendorProfile | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    const record = {
      organization_id: org.orgId,
      business_name: data.business_name,
      category: data.category,
      description: data.description ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      website: data.website ?? null,
      specialties: data.specialties ?? [],
      service_area: data.service_area ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("vendor_profiles")
      .upsert(record, { onConflict: "organization_id" })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/vendor-profile");
    return { data: result as VendorProfile, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to save vendor profile" };
  }
}

export async function getVendorByOrgIdAction(
  organizationId: string
): Promise<{ data: VendorProfile | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("*, organizations(*)")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VendorProfile | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to fetch vendor profile" };
  }
}

export async function searchVendorsAction(
  query: string,
  category?: string
): Promise<{ data: VendorProfile[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const searchTerm = `%${query}%`;

    let q = supabase
      .from("vendor_profiles")
      .select("*, organizations(id, name, slug, organization_type, logo_url)")
      .or(`business_name.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .order("business_name")
      .limit(20);

    if (category) {
      q = q.eq("category", category);
    }

    const { data, error } = await q;

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as VendorProfile[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message ?? "Failed to search vendors" };
  }
}
