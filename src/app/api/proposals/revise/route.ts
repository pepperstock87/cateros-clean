import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId, revisionNotes } = await req.json();

    if (!proposalId) {
      return NextResponse.json(
        { error: "proposalId is required" },
        { status: 400 }
      );
    }

    // Fetch the original proposal and verify ownership
    const { data: original, error: fetchError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Find the highest revision number among siblings (same event_id)
    const { data: siblings } = await supabase
      .from("proposals")
      .select("revision_number")
      .eq("event_id", original.event_id)
      .eq("user_id", user.id)
      .order("revision_number", { ascending: false })
      .limit(1);

    const nextRevision = (siblings?.[0]?.revision_number ?? 1) + 1;

    // Generate a new share token
    const shareToken = crypto.randomUUID();

    // Create the new revision
    const { data: newProposal, error: insertError } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        event_id: original.event_id,
        title: original.title,
        status: "draft",
        custom_message: original.custom_message,
        terms: original.terms,
        share_token: shareToken,
        revision_number: nextRevision,
        revision_notes: revisionNotes?.trim() || null,
        parent_proposal_id: original.id,
      })
      .select("id")
      .single();

    if (insertError || !newProposal) {
      console.error("Failed to create revision:", insertError);
      return NextResponse.json(
        { error: "Failed to create revision" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: newProposal.id, revision_number: nextRevision });
  } catch (err) {
    console.error("Revision API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
