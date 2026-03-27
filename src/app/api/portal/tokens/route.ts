import { fetchPortalTokensAction } from "@/lib/actions/portalTokens";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const tokens = await fetchPortalTokensAction(eventId);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Failed to fetch portal tokens:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch portal tokens" },
      { status: 500 }
    );
  }
}
