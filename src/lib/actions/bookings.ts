"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { VenueBooking, VenueAvailabilityBlock } from "@/types";

/**
 * Fetch bookings for a given month and optional space
 */
export async function getBookingsForMonthAction(
  year: number,
  month: number,
  spaceId?: string
): Promise<{ data: VenueBooking[]; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: [], error: "No organization context" };

    const supabase = await createClient();

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    let query = supabase
      .from("venue_bookings")
      .select("*")
      .eq("organization_id", org.orgId)
      .gte("booking_date", startDate)
      .lte("booking_date", endDate);

    if (spaceId) {
      query = query.eq("space_id", spaceId);
    }

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as VenueBooking[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message ?? "Failed to fetch bookings" };
  }
}

/**
 * Check availability for a time slot on a given space+date
 */
export async function checkAvailabilityAction(
  spaceId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { available: false, reason: "No organization context" };

    const supabase = await createClient();

    // Check for overlapping non-canceled bookings
    const { data: bookings, error } = await supabase
      .from("venue_bookings")
      .select("start_time, end_time")
      .eq("space_id", spaceId)
      .eq("booking_date", bookingDate)
      .neq("status", "canceled");

    if (error) return { available: false, reason: error.message };

    // Check for time overlap
    for (const booking of bookings ?? []) {
      const existingStart = booking.start_time;
      const existingEnd = booking.end_time;

      // Check if times overlap
      if (startTime < existingEnd && endTime > existingStart) {
        return {
          available: false,
          reason: `Conflicts with existing booking ${existingStart}-${existingEnd}`,
        };
      }
    }

    return { available: true };
  } catch (err: any) {
    return {
      available: false,
      reason: err.message ?? "Error checking availability",
    };
  }
}

/**
 * Create a new booking with overlap check
 */
export async function createBookingAction(data: {
  space_id: string;
  title: string;
  client_name?: string;
  client_email?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  setup_start?: string;
  teardown_end?: string;
  status?: "hold" | "confirmed";
  rental_fee?: number;
  event_id?: string;
  notes?: string;
}): Promise<{ data: VenueBooking | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    // Check availability first
    const { available, reason } = await checkAvailabilityAction(
      data.space_id,
      data.booking_date,
      data.start_time,
      data.end_time
    );

    if (!available) {
      return { data: null, error: reason || "Time slot unavailable" };
    }

    const supabase = await createClient();

    const record = {
      space_id: data.space_id,
      organization_id: org.orgId,
      title: data.title,
      client_name: data.client_name ?? null,
      client_email: data.client_email ?? null,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      setup_start: data.setup_start ?? null,
      teardown_end: data.teardown_end ?? null,
      status: data.status ?? "hold",
      rental_fee: data.rental_fee ?? null,
      event_id: data.event_id ?? null,
      notes: data.notes ?? null,
    };

    const { data: result, error } = await supabase
      .from("venue_bookings")
      .insert([record])
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/availability");
    return { data: result as VenueBooking, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to create booking" };
  }
}

/**
 * Update an existing booking
 */
export async function updateBookingAction(
  id: string,
  data: Partial<{
    title: string;
    client_name: string;
    client_email: string;
    start_time: string;
    end_time: string;
    setup_start: string;
    teardown_end: string;
    status: "hold" | "confirmed" | "canceled";
    rental_fee: number;
    notes: string;
  }>
): Promise<{ data: VenueBooking | null; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    // Get current booking to validate org
    const { data: booking, error: fetchError } = await supabase
      .from("venue_bookings")
      .select("*")
      .eq("id", id)
      .eq("organization_id", org.orgId)
      .single();

    if (fetchError || !booking) {
      return { data: null, error: "Booking not found" };
    }

    // If changing times, check availability
    if (data.start_time || data.end_time) {
      const newStart = data.start_time || booking.start_time;
      const newEnd = data.end_time || booking.end_time;

      const { available, reason } = await checkAvailabilityAction(
        booking.space_id,
        booking.booking_date,
        newStart,
        newEnd
      );

      // Exclude current booking from overlap check by verifying it's a different booking
      if (
        !available &&
        reason?.includes("Conflicts") &&
        !(
          newStart === booking.start_time && newEnd === booking.end_time
        )
      ) {
        return { data: null, error: reason };
      }
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("venue_bookings")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", org.orgId)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/availability");
    return { data: result as VenueBooking, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? "Failed to update booking" };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBookingAction(
  id: string
): Promise<{ data: VenueBooking | null; error: string | null }> {
  return updateBookingAction(id, { status: "canceled" });
}

/**
 * Get availability blocks for a space
 */
export async function getAvailabilityBlocksAction(
  spaceId: string
): Promise<{ data: VenueAvailabilityBlock[]; error: string | null }> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: [], error: "No organization context" };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("venue_availability_blocks")
      .select("*")
      .eq("space_id", spaceId)
      .eq("organization_id", org.orgId);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as VenueAvailabilityBlock[], error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err.message ?? "Failed to fetch availability blocks",
    };
  }
}

/**
 * Create availability block
 */
export async function createAvailabilityBlockAction(data: {
  space_id: string;
  day_of_week?: number;
  specific_date?: string;
  start_time: string;
  end_time: string;
  block_type: "available" | "blocked" | "maintenance";
  label?: string;
  is_recurring?: boolean;
}): Promise<{
  data: VenueAvailabilityBlock | null;
  error: string | null;
}> {
  try {
    const org = await getCurrentOrg();
    if (!org) return { data: null, error: "No organization context" };

    const supabase = await createClient();

    const record = {
      space_id: data.space_id,
      organization_id: org.orgId,
      day_of_week: data.day_of_week ?? null,
      specific_date: data.specific_date ?? null,
      start_time: data.start_time,
      end_time: data.end_time,
      block_type: data.block_type,
      label: data.label ?? null,
      is_recurring: data.is_recurring ?? false,
    };

    const { data: result, error } = await supabase
      .from("venue_availability_blocks")
      .insert([record])
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/availability");
    return { data: result as VenueAvailabilityBlock, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err.message ?? "Failed to create availability block",
    };
  }
}
