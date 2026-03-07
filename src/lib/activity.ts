import { createClient } from "@/lib/supabase/server";

export type ActivityType =
  | "status_change"
  | "pricing_update"
  | "payment_added"
  | "staff_assigned"
  | "staff_removed"
  | "proposal_sent"
  | "proposal_responded"
  | "note_added"
  | "event_created"
  | "event_updated";

export async function logActivity(
  eventId: string,
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from("event_activity").insert({
    event_id: eventId,
    user_id: userId,
    type,
    description,
    metadata: metadata || null,
  });
}
