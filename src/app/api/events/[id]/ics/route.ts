import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { generateICSFile } from "@/lib/calendar";
import { NextRequest, NextResponse } from "next/server";
import type { Event } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getCurrentOrg();

  let query = supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id);

  if (org?.orgId) {
    query = query.eq("organization_id", org.orgId);
  }

  const { data: event, error } = await query.single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const icsContent = generateICSFile(event as Event);
  const safeName = event.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
    },
  });
}
