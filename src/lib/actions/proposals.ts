"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

/** Valid status transitions for proposals */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "declined"],
  sent: ["viewed", "approved", "declined", "expired"],
  viewed: ["approved", "signed", "declined", "expired"],
  approved: ["signed", "deposit_paid", "booked", "declined"],
  signed: ["deposit_paid", "booked", "declined"],
  deposit_paid: ["booked", "declined"],
  booked: ["declined"], // Allow cancellation
  declined: ["draft"], // Allow reopening
  expired: ["draft", "sent"], // Allow resending
};

export async function updateProposalStatusAction(
  proposalId: string,
  status: "draft" | "sent" | "viewed" | "approved" | "signed" | "deposit_paid" | "booked" | "declined" | "expired"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  // Fetch current status and validate transition
  const { data: currentProposal } = await supabase
    .from("proposals")
    .select("status")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .single();

  if (currentProposal) {
    const currentStatus = currentProposal.status as string;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (allowedTransitions && !allowedTransitions.includes(status)) {
      return { error: `Cannot change status from "${currentStatus}" to "${status}"` };
    }
  }

  let statusQuery = supabase
    .from("proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id);
  if (org?.orgId) statusQuery = statusQuery.eq("organization_id", org.orgId);
  const { error } = await statusQuery;

  if (error) return { error: error.message };

  // If proposal booked, update linked event status to confirmed
  if (status === "booked") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("id", proposalId)
      .eq("user_id", user.id)
      .single();

    if (proposal?.event_id) {
      let confirmQuery = supabase
        .from("events")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
      if (org?.orgId) confirmQuery = confirmQuery.eq("organization_id", org.orgId);
      const { error: confirmError } = await confirmQuery;
      if (confirmError) console.error("Failed to confirm event:", confirmError.message);
      revalidatePath(`/events/${proposal.event_id}`);
    }
  }

  // If proposal sent, update linked event status to proposed
  if (status === "sent") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("id", proposalId)
      .eq("user_id", user.id)
      .single();

    if (proposal?.event_id) {
      let proposedQuery = supabase
        .from("events")
        .update({ status: "proposed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
      if (org?.orgId) proposedQuery = proposedQuery.eq("organization_id", org.orgId);
      const { error: proposedError } = await proposedQuery;
      if (proposedError) console.error("Failed to set event proposed:", proposedError.message);
      revalidatePath(`/events/${proposal.event_id}`);
    }
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
  return {};
}

export async function markProposalViewedAction(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  // Only set viewed_at if not already set
  let viewQuery = supabase
    .from("proposals")
    .update({ viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .is("viewed_at", null);
  if (org?.orgId) viewQuery = viewQuery.eq("organization_id", org.orgId);
  const { error } = await viewQuery;

  if (error) return { error: error.message };

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
