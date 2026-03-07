"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

export async function assignStaffAction(
  eventId: string,
  staffMemberId: string,
  role: string,
  startTime?: string,
  endTime?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check for existing assignment
  const { data: existing } = await supabase
    .from("event_staff_assignments")
    .select("id")
    .eq("event_id", eventId)
    .eq("staff_member_id", staffMemberId)
    .single();

  if (existing) return { error: "Staff member already assigned to this event" };

  const { error } = await supabase.from("event_staff_assignments").insert({
    event_id: eventId,
    staff_member_id: staffMemberId,
    user_id: user.id,
    role: role || null,
    start_time: startTime || null,
    end_time: endTime || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function updateAssignmentAction(
  assignmentId: string,
  data: { confirmed?: boolean; start_time?: string; end_time?: string; notes?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let updateQuery = supabase
    .from("event_staff_assignments")
    .update(data)
    .eq("id", assignmentId)
    .eq("user_id", user.id);
  if (org?.orgId) updateQuery = updateQuery.eq("organization_id", org.orgId);
  const { error } = await updateQuery;

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeAssignmentAction(assignmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let fetchAssignQuery = supabase
    .from("event_staff_assignments")
    .select("event_id")
    .eq("id", assignmentId)
    .eq("user_id", user.id);
  if (org?.orgId) fetchAssignQuery = fetchAssignQuery.eq("organization_id", org.orgId);
  const { data: assignment } = await fetchAssignQuery.single();

  let deleteQuery = supabase
    .from("event_staff_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("user_id", user.id);
  if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
  const { error } = await deleteQuery;

  if (error) return { error: error.message };
  if (assignment) revalidatePath(`/events/${assignment.event_id}`);
  return { success: true };
}
