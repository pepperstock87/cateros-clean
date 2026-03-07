import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposal_id");
  const shareToken = searchParams.get("share_token");

  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // If share_token is provided, verify it matches the proposal (client access)
  if (shareToken) {
    const { data: proposal } = await serviceSupabase
      .from("proposals")
      .select("id")
      .eq("id", proposalId)
      .eq("share_token", shareToken)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 403 });
    }
  } else {
    // Caterer access — verify auth and ownership
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrg();

    let proposalQuery = serviceSupabase
      .from("proposals")
      .select("id")
      .eq("id", proposalId)
      .eq("user_id", user.id);
    if (org?.orgId) proposalQuery = proposalQuery.eq("organization_id", org.orgId);
    const { data: proposal } = await proposalQuery.single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
  }

  const { data: comments, error } = await serviceSupabase
    .from("proposal_comments")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }

  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  const { proposal_id, author_name, author_type, message, share_token } = await req.json();

  if (!proposal_id || !author_name || !author_type || !message?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["caterer", "client"].includes(author_type)) {
    return NextResponse.json({ error: "Invalid author_type" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate access
  if (author_type === "client") {
    // Client must provide a valid share_token
    if (!share_token) {
      return NextResponse.json({ error: "share_token required for client comments" }, { status: 403 });
    }

    const { data: proposal } = await serviceSupabase
      .from("proposals")
      .select("id")
      .eq("id", proposal_id)
      .eq("share_token", share_token)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 403 });
    }
  } else {
    // Caterer must be authenticated and own the proposal
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrg();

    let postProposalQuery = serviceSupabase
      .from("proposals")
      .select("id")
      .eq("id", proposal_id)
      .eq("user_id", user.id);
    if (org?.orgId) postProposalQuery = postProposalQuery.eq("organization_id", org.orgId);
    const { data: proposal } = await postProposalQuery.single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
  }

  const { data: comment, error } = await serviceSupabase
    .from("proposal_comments")
    .insert({
      proposal_id,
      author_name: author_name.trim(),
      author_type,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
