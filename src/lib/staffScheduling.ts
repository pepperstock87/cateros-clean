import { createClient } from "@/lib/supabase/server";

export type ConflictInfo = {
  eventId: string;
  eventName: string;
  eventDate: string;
  role: string | null;
};

export type StaffAvailabilityEntry = {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  phone: string | null;
  email: string | null;
  status: "available" | "busy";
  assignedEvent: { id: string; name: string; role: string | null } | null;
};

export type StaffSuggestion = {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  roleMatch: boolean;
};

/**
 * Check if a staff member has a scheduling conflict on a given date.
 * Optionally exclude a specific event (useful when checking the event being edited).
 */
export async function checkConflicts(
  staffId: string,
  eventDate: string,
  eventId?: string
): Promise<ConflictInfo | null> {
  const supabase = await createClient();

  // Find all assignments for this staff member
  const { data: assignments, error } = await supabase
    .from("event_staff_assignments")
    .select("event_id, role, events!inner(id, name, event_date)")
    .eq("staff_member_id", staffId);

  if (error || !assignments) return null;

  for (const assignment of assignments) {
    const event = assignment.events as unknown as { id: string; name: string; event_date: string };
    if (!event) continue;

    // Skip the current event if provided
    if (eventId && event.id === eventId) continue;

    // Compare dates (normalize to YYYY-MM-DD)
    const assignedDate = event.event_date.split("T")[0];
    const checkDate = eventDate.split("T")[0];

    if (assignedDate === checkDate) {
      return {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.event_date,
        role: assignment.role,
      };
    }
  }

  return null;
}

/**
 * Get availability status for all staff members on a given date.
 * Scoped to the authenticated user's staff.
 */
export async function getStaffAvailability(
  date: string,
  userId: string
): Promise<StaffAvailabilityEntry[]> {
  const supabase = await createClient();
  const normalizedDate = date.split("T")[0];

  // Get all staff for this user
  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("id, name, role, hourly_rate, phone, email")
    .eq("user_id", userId)
    .order("name");

  if (staffError || !staff) return [];

  // Get all events on this date for this user
  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_date")
    .eq("user_id", userId);

  const dateEvents = (events || []).filter(
    (e) => e.event_date.split("T")[0] === normalizedDate
  );
  const dateEventIds = new Set(dateEvents.map((e) => e.id));

  if (dateEventIds.size === 0) {
    // No events on this date, everyone is available
    return staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      hourly_rate: s.hourly_rate,
      phone: s.phone,
      email: s.email,
      status: "available" as const,
      assignedEvent: null,
    }));
  }

  // Get assignments for events on this date
  const { data: assignments } = await supabase
    .from("event_staff_assignments")
    .select("staff_member_id, event_id, role")
    .in("event_id", Array.from(dateEventIds));

  const staffAssignmentMap = new Map<
    string,
    { eventId: string; eventName: string; role: string | null }
  >();
  for (const a of assignments || []) {
    const event = dateEvents.find((e) => e.id === a.event_id);
    if (event) {
      staffAssignmentMap.set(a.staff_member_id, {
        eventId: event.id,
        eventName: event.name,
        role: a.role,
      });
    }
  }

  return staff.map((s) => {
    const assignment = staffAssignmentMap.get(s.id);
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      hourly_rate: s.hourly_rate,
      phone: s.phone,
      email: s.email,
      status: assignment ? ("busy" as const) : ("available" as const),
      assignedEvent: assignment
        ? { id: assignment.eventId, name: assignment.eventName, role: assignment.role }
        : null,
    };
  });
}

/**
 * Suggest available staff for an event, optionally filtered by role.
 * Returns available staff sorted with role matches first.
 */
export async function suggestStaff(
  eventId: string,
  role?: string
): Promise<StaffSuggestion[]> {
  const supabase = await createClient();

  // Get the event to know its date
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, event_date, user_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) return [];

  const availability = await getStaffAvailability(event.event_date, event.user_id);

  // Also exclude staff already assigned to THIS event
  const { data: currentAssignments } = await supabase
    .from("event_staff_assignments")
    .select("staff_member_id")
    .eq("event_id", eventId);

  const alreadyAssigned = new Set(
    (currentAssignments || []).map((a) => a.staff_member_id)
  );

  const suggestions: StaffSuggestion[] = availability
    .filter((s) => s.status === "available" && !alreadyAssigned.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      hourly_rate: s.hourly_rate,
      roleMatch: role
        ? s.role.toLowerCase().includes(role.toLowerCase())
        : false,
    }));

  // Sort role matches first
  suggestions.sort((a, b) => {
    if (a.roleMatch && !b.roleMatch) return -1;
    if (!a.roleMatch && b.roleMatch) return 1;
    return a.name.localeCompare(b.name);
  });

  return suggestions;
}
