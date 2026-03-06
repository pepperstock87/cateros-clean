"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProposalStatusAction(
  proposalId: string,
  status: "draft" | "sent" | "accepted" | "declined"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // If proposal accepted, update linked event status to confirmed
  if (status === "accepted") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("event_id")
      .eq("id", proposalId)
      .single();

    if (proposal?.event_id) {
      await supabase
        .from("events")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
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
      await supabase
        .from("events")
        .update({ status: "proposed", updated_at: new Date().toISOString() })
        .eq("id", proposal.event_id)
        .eq("user_id", user.id);
      revalidatePath(`/events/${proposal.event_id}`);
    }
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
  return {};
}

export async function deleteProposalAction(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  return {};
}
