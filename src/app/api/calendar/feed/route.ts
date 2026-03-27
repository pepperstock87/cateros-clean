/**
 * GET /api/calendar/feed?token=xxx
 * Returns ICS calendar feed for authenticated token
 * No session auth required — token-based access only
 */

import { createClient } from "@/lib/supabase/server";
import { generateUserCalendarFeed } from "@/lib/cain/integrations/calendar";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token parameter", { status: 400 });
    }

    const supabase = await createClient();

    // Find user by token
    const { data: settings, error: settingsError } = await supabase
      .from("business_settings")
      .select("user_id, organization_id")
      .eq("calendar_feed_token", token)
      .single();

    if (settingsError || !settings) {
      return new Response("Invalid or expired token", { status: 403 });
    }

    // Generate calendar feed
    const icsContent = await generateUserCalendarFeed(settings.user_id, settings.organization_id);

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cateros-events.ics"',
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Calendar feed error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
