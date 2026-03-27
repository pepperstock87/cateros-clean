import { revokePortalTokenAction } from "@/lib/actions/portalTokens";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    await revokePortalTokenAction(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke portal token:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to revoke portal token" },
      { status: 500 }
    );
  }
}
