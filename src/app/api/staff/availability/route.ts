import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getStaffAvailability } from "@/lib/staffScheduling";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const eventId = searchParams.get("event_id");

  if (!date) {
    return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
  }

  const availability = await getStaffAvailability(date, user.id);

  // If event_id is provided, exclude that event from "busy" status
  // (staff assigned to the current event should show as available for re-assignment purposes)
  if (eventId) {
    const adjusted = availability.map((entry) => {
      if (entry.status === "busy" && entry.assignedEvent?.id === eventId) {
        return { ...entry, status: "available" as const, assignedEvent: null };
      }
      return entry;
    });
    return NextResponse.json({ staff: adjusted });
  }

  return NextResponse.json({ staff: availability });
}
