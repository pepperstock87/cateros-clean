import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Public POST endpoint for tracking when a client views a proposal.
 * No auth required — validates via share_token.
 *
 * POST body: { share_token: string }
 * Sets viewed_at and status to "viewed" if currently "sent".
 */
export async function POST(req: Request) {
  const { share_token } = await req.json();

  if (!share_token || typeof share_token !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Use service role to bypass RLS — this is a public endpoint
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find proposal by share token
  const { data: proposal, error: findError } = await supabase
    .from("proposals")
    .select("id, status, viewed_at")
    .eq("share_token", share_token)
    .single();

  if (findError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Set viewed_at if not already set
  if (!proposal.viewed_at) {
    const updates: Record<string, unknown> = {
      viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Only transition status to "viewed" if currently "sent"
    if (proposal.status === "sent") {
      updates.status = "viewed";
    }

    await supabase
      .from("proposals")
      .update(updates)
      .eq("id", proposal.id);
  }

  return NextResponse.json({
    success: true,
    status: proposal.status === "sent" ? "viewed" : proposal.status,
  });
}
