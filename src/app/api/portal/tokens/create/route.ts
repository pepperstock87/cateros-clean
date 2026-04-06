import { generatePortalTokenAction } from "@/lib/actions/portalTokens";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, clientEmail, clientName } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const result = await generatePortalTokenAction({
      eventId,
      clientEmail,
      clientName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create portal token:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create portal token" },
      { status: 500 }
    );
  }
}
