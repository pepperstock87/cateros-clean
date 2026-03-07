"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

export async function updateProposalStatusAction(
  proposalId: string,
  status: "draft" | "sent" | "accepted" | "declined"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let statusQuery = supabase
    .from("proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id);
  if (org?.orgId) statusQuery = statusQuery.eq("organization_id", org.orgId);
  const { error } = await statusQuery;

  if (error) return { error: error.message };

  // If proposal accepted, update linked event status to confirmed
  if (status === "accepted") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("id", proposalId)
      .single();

    if (proposal?.event_id) {
      let confirmQuery = supabase
        .from("events")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
      if (org?.orgId) confirmQuery = confirmQuery.eq("organization_id", org.orgId);
      await confirmQuery;
      revalidatePath(`/events/${proposal.event_id}`);
    }
  }

  // If proposal sent, update linked event status to proposed
  if (status === "sent") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("id", proposalId)
      .single();

    if (proposal?.event_id) {
      let proposedQuery = supabase
        .from("events")
        .update({ status: "proposed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
      if (org?.orgId) proposedQuery = proposedQuery.eq("organization_id", org.orgId);
      await proposedQuery;
      revalidatePath(`/events/${proposal.event_id}`);
    }
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
  return {};
}

export async function replyToClientAction(proposalId: string, message: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();

  let fetchQuery = supabase
    .from("proposals")
    .select("client_messages")
    .eq("id", proposalId)
    .eq("user_id", user.id);
  if (org?.orgId) fetchQuery = fetchQuery.eq("organization_id", org.orgId);
  const { data: proposal } = await fetchQuery.single();

  if (!proposal) return { error: "Proposal not found" };

  const messages = Array.isArray(proposal.client_messages) ? proposal.client_messages : [];
  messages.push({
    id: crypto.randomUUID(),
    from: "caterer",
    message: message.trim(),
    created_at: new Date().toISOString(),
  });

  let replyQuery = supabase
    .from("proposals")
    .update({ client_messages: messages, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id);
  if (org?.orgId) replyQuery = replyQuery.eq("organization_id", org.orgId);
  const { error } = await replyQuery;

  if (error) return { error: error.message };

  revalidatePath(`/proposals/${proposalId}`);
  return {};
}

export async function deleteProposalAction(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let delProposalQuery = supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId)
    .eq("user_id", user.id);
  if (org?.orgId) delProposalQuery = delProposalQuery.eq("organization_id", org.orgId);
  const { error } = await delProposalQuery;

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  return {};
}
