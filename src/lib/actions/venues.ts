"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { VenueProfile } from "@/types";

export async function getVenueProfileAction(): Promise<{
  data: VenueProfile | null;
  error: string | null;
}> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_profiles")
      .select("*")
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VenueProfile | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to fetch venue profile" };
  }
}

export async function upsertVenueProfileAction(data: {
  venue_name: string;
  description?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  capacity_seated?: number;
  capacity_standing?: number;
  website?: string;
  indoor_outdoor?: string;
  indoor_outdoor_notes?: string;
  parking_notes?: string;
  access_notes?: string;
  amenities?: string[];
}): Promise<{ data: VenueProfile | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    const record = {
      organization_id: org.orgId,
      venue_name: data.venue_name,
      description: data.description ?? null,
      address_line_1: data.address_line_1 ?? null,
      address_line_2: data.address_line_2 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postal_code: data.postal_code ?? null,
      capacity_seated: data.capacity_seated ?? null,
      capacity_standing: data.capacity_standing ?? null,
      website: data.website ?? null,
      indoor_outdoor: data.indoor_outdoor ?? null,
      indoor_outdoor_notes: data.indoor_outdoor_notes ?? null,
      parking_notes: data.parking_notes ?? null,
      access_notes: data.access_notes ?? null,
      amenities: data.amenities ?? [],
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("venue_profiles")
      .upsert(record, { onConflict: "organization_id" })
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/venues");
    return { data: result as VenueProfile, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to save venue profile" };
  }
}

export async function getVenueByOrgIdAction(
  organizationId: string
): Promise<{ data: VenueProfile | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_profiles")
      .select("*, organizations(*)")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VenueProfile | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to fetch venue" };
  }
}

export async function searchVenuesAction(
  query: string
): Promise<{ data: VenueProfile[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const searchTerm = `%${query}%`;

    const { data, error } = await supabase
      .from("venue_profiles")
      .select("*, organizations(id, name, slug, organization_type, logo_url)")
      .or(`venue_name.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .order("venue_name")
      .limit(20);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as VenueProfile[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message ?? "Failed to search venues" };
  }
}
