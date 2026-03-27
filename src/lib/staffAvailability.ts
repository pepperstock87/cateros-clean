import { createClient } from "@/lib/supabase/server";

export interface BookingConflict {
  staffName: string;
  staffId: string;
  conflictingEventName: string;
  conflictingEventId: string;
  conflictingDate: string;
}

/**
 * Check if any staff members have overlapping assignments on the same date.
 * Returns conflicts found, or empty array if no conflicts.
 */
export async function checkStaffConflicts(
  eventId: string,
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  staffMemberIds: string[]
): Promise<BookingConflict[]> {
  if (!staffMemberIds.length || !eventDate) return [];

  const supabase = await createClient();

  // Find all assignments for these staff members on the same date
  const { data: existingAssignments } = await supabase
    .from("event_staff_assignments")
    .select(`
      id,
      staff_member_id,
      start_time,
      end_time,
      event_id,
      events!inner(id, name, event_date, start_time, end_time),
      staff_members!inner(id, name)
    `)
    .in("staff_member_id", staffMemberIds)
    .neq("event_id", eventId); // Exclude the current event

  if (!existingAssignments?.length) return [];

  const conflicts: BookingConflict[] = [];

  for (const assignment of existingAssignments) {
    const event = assignment.events as any;
    if (!event) continue;

    // Check if it's the same date
    const assignmentDate = event.event_date?.split("T")[0];
    const checkDate = eventDate.split("T")[0];
    if (assignmentDate !== checkDate) continue;

    // If times are provided, check for overlap
    if (startTime && endTime && event.start_time && event.end_time) {
      const newStart = startTime.replace(/:/g, "");
      const newEnd = endTime.replace(/:/g, "");
      const existStart = (assignment.start_time || event.start_time).replace(/:/g, "");
      const existEnd = (assignment.end_time || event.end_time).replace(/:/g, "");

      // No overlap if one ends before the other starts
      if (newEnd <= existStart || newStart >= existEnd) continue;
    }

    const staff = assignment.staff_members as any;
    conflicts.push({
      staffName: staff?.name || "Unknown",
      staffId: assignment.staff_member_id,
      conflictingEventName: event.name || "Unknown Event",
      conflictingEventId: event.id,
      conflictingDate: assignmentDate,
    });
  }

  return conflicts;
}
