/**
 * POST /api/calendar/token
 * Generate a secure calendar feed token (requires auth)
 * Returns the feed URL: ${APP_URL}/api/calendar/feed?token=xxx
 */

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a 64-char hex token
    const token = randomBytes(32).toString("hex");

    // Store token in business_settings
    const { error: upsertError } = await supabase
      .from("business_settings")
      .upsert(
        {
          user_id: user.id,
          calendar_feed_token: token,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to store calendar token:", upsertError);
      return Response.json({ error: "Failed to generate token" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const feedUrl = `${appUrl}/api/calendar/feed?token=${token}`;

    return Response.json(
      {
        success: true,
        token,
        feedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Calendar token error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
