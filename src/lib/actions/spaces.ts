"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { VenueSpace } from "@/types";

export async function getSpacesAction(): Promise<{
  data: VenueSpace[];
  error: string | null;
}> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: [], error: "No organization context" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_spaces")
      .select("*")
      .eq("organization_id", org.orgId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as VenueSpace[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message ?? "Failed to fetch spaces" };
  }
}

export async function getSpaceAction(id: string): Promise<{
  data: VenueSpace | null;
  error: string | null;
}> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_spaces")
      .select("*")
      .eq("id", id)
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data as VenueSpace | null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to fetch space" };
  }
}

export async function createSpaceAction(data: {
  venue_profile_id: string;
  name: string;
  description?: string;
  space_type?: string;
  capacity_seated?: number;
  capacity_standing?: number;
  square_footage?: number;
  hourly_rate?: number;
  daily_rate?: number;
  half_day_rate?: number;
  setup_time_minutes?: number;
  teardown_time_minutes?: number;
  indoor_outdoor?: string;
  amenities?: string[];
}): Promise<{ data: VenueSpace | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    // Verify venue profile belongs to org
    const { data: venueCheck, error: venueError } = await supabase
      .from("venue_profiles")
      .select("id")
      .eq("id", data.venue_profile_id)
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (venueError || !venueCheck) {
      return { data: null, error: "Venue profile not found or not authorized" };
    }

    const record = {
      venue_profile_id: data.venue_profile_id,
      organization_id: org.orgId,
      name: data.name,
      description: data.description ?? null,
      space_type: data.space_type ?? null,
      capacity_seated: data.capacity_seated ?? null,
      capacity_standing: data.capacity_standing ?? null,
      square_footage: data.square_footage ?? null,
      hourly_rate: data.hourly_rate ?? null,
      daily_rate: data.daily_rate ?? null,
      half_day_rate: data.half_day_rate ?? null,
      setup_time_minutes: data.setup_time_minutes ?? 60,
      teardown_time_minutes: data.teardown_time_minutes ?? 60,
      indoor_outdoor: data.indoor_outdoor ?? null,
      amenities: data.amenities ?? [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("venue_spaces")
      .insert(record)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/spaces");
    return { data: result as VenueSpace, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to create space" };
  }
}

export async function updateSpaceAction(
  id: string,
  data: {
    name?: string;
    description?: string;
    space_type?: string;
    capacity_seated?: number;
    capacity_standing?: number;
    square_footage?: number;
    hourly_rate?: number;
    daily_rate?: number;
    half_day_rate?: number;
    setup_time_minutes?: number;
    teardown_time_minutes?: number;
    indoor_outdoor?: string;
    amenities?: string[];
  }
): Promise<{ data: VenueSpace | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    // Verify space belongs to org
    const { data: spaceCheck, error: spaceError } = await supabase
      .from("venue_spaces")
      .select("id")
      .eq("id", id)
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (spaceError || !spaceCheck) {
      return { data: null, error: "Space not found or not authorized" };
    }

    const record: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) record.name = data.name;
    if (data.description !== undefined) record.description = data.description ?? null;
    if (data.space_type !== undefined) record.space_type = data.space_type ?? null;
    if (data.capacity_seated !== undefined) record.capacity_seated = data.capacity_seated ?? null;
    if (data.capacity_standing !== undefined) record.capacity_standing = data.capacity_standing ?? null;
    if (data.square_footage !== undefined) record.square_footage = data.square_footage ?? null;
    if (data.hourly_rate !== undefined) record.hourly_rate = data.hourly_rate ?? null;
    if (data.daily_rate !== undefined) record.daily_rate = data.daily_rate ?? null;
    if (data.half_day_rate !== undefined) record.half_day_rate = data.half_day_rate ?? null;
    if (data.setup_time_minutes !== undefined) record.setup_time_minutes = data.setup_time_minutes;
    if (data.teardown_time_minutes !== undefined) record.teardown_time_minutes = data.teardown_time_minutes;
    if (data.indoor_outdoor !== undefined) record.indoor_outdoor = data.indoor_outdoor ?? null;
    if (data.amenities !== undefined) record.amenities = data.amenities;

    const { data: result, error } = await supabase
      .from("venue_spaces")
      .update(record)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/spaces");
    return { data: result as VenueSpace, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to update space" };
  }
}

export async function deleteSpaceAction(id: string): Promise<{ error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { error: "No organization context" };

    const supabase = await createClient();

    // Verify space belongs to org
    const { data: spaceCheck, error: spaceError } = await supabase
      .from("venue_spaces")
      .select("id")
      .eq("id", id)
      .eq("organization_id", org.orgId)
      .maybeSingle();

    if (spaceError || !spaceCheck) {
      return { error: "Space not found or not authorized" };
    }

    const { error } = await supabase
      .from("venue_spaces")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/spaces");
    return { error: null };
  } catch (err: any) {
    return { error: err.message ?? "Failed to delete space" };
  }
}
