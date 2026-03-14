"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import type { CainDraftSnapshot } from "@/lib/cain/types";

export async function saveCainDraft(draft: CainDraftSnapshot) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const row = {
    user_id: user.id,
    organization_id: org?.orgId || null,
    status: "active" as const,
    messages: draft.messages,
    plan: draft.plan,
    show_review: draft.showReview,
    last_input: draft.lastInput,
    extracted_entities: draft.extractedEntities,
    updated_at: new Date().toISOString(),
  };

  if (draft.draftId) {
    // Update existing draft
    const { error } = await supabase
      .from("cain_drafts")
      .update(row)
      .eq("id", draft.draftId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    return { success: true, draftId: draft.draftId };
  }

  // Insert new draft
  const { data, error } = await supabase
    .from("cain_drafts")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, draftId: data.id as string };
}

export async function loadActiveCainDraft(): Promise<{
  draft: CainDraftSnapshot | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let query = supabase
    .from("cain_drafts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (org?.orgId) query = query.eq("organization_id", org.orgId);

  const { data, error } = await query;

  if (error) return { draft: null, error: error.message };
  if (!data || data.length === 0) return { draft: null };

  const row = data[0];
  return {
    draft: {
      draftId: row.id,
      messages: row.messages as CainDraftSnapshot["messages"],
      plan: row.plan as CainDraftSnapshot["plan"],
      showReview: row.show_review,
      lastInput: row.last_input || "",
      updatedAt: new Date(row.updated_at).getTime(),
      extractedEntities: (row.extracted_entities as CainDraftSnapshot["extractedEntities"]) ?? null,
    },
  };
}

export async function markDraftCommitted(draftId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cain_drafts")
    .update({ status: "committed", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markDraftAbandoned(draftId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cain_drafts")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
