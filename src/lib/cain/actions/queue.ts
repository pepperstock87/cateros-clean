/**
 * CAIN Action Queue
 * Server-side functions for managing the approval queue
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  CainPendingAction,
  CainActionStatus,
  CainActionResult,
  CainActionPayload,
  CainActionType,
  CainActionStats,
  CainProposeActionRequest,
} from "./types";

/**
 * Propose a new action that requires approval
 */
export async function proposeAction(
  userId: string,
  request: CainProposeActionRequest,
  orgId?: string | null
): Promise<{ success: boolean; actionId?: string; error?: string }> {
  const supabase = await createClient();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // Expire after 24 hours

  const { data, error } = await supabase
    .from("cain_pending_actions")
    .insert({
      user_id: userId,
      organization_id: orgId || null,
      session_id: request.session_id || null,
      action_type: request.action_type,
      title: request.title,
      description: request.description || null,
      payload: request.payload,
      preview_data: request.preview_data || null,
      status: "pending",
      priority: request.priority || "normal",
      requires_input: request.requires_input || false,
      input_prompt: request.input_prompt || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, actionId: data.id };
}

/**
 * Get all pending actions for a user (optionally filtered by org)
 */
export async function getPendingActions(
  userId: string,
  orgId?: string | null
): Promise<{ actions: CainPendingAction[]; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("cain_pending_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;

  if (error) return { actions: [], error: error.message };
  return { actions: (data || []) as CainPendingAction[] };
}

/**
 * Get a single action by ID (with user check)
 */
export async function getAction(
  actionId: string,
  userId: string
): Promise<{ action?: CainPendingAction; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cain_pending_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", userId)
    .single();

  if (error) return { error: error.message };
  return { action: data as CainPendingAction };
}

/**
 * Approve an action and mark it for execution
 */
export async function approveAction(
  actionId: string,
  userId: string,
  userInput?: Record<string, unknown>
): Promise<{ success: boolean; action?: CainPendingAction; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cain_pending_actions")
    .update({
      status: "approved",
      user_input: userInput || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/cain/actions");
  return { success: true, action: data as CainPendingAction };
}

/**
 * Reject an action
 */
export async function rejectAction(
  actionId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cain_pending_actions")
    .update({
      status: "rejected",
      error: reason || "Rejected by user",
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/cain/actions");
  return { success: true };
}

/**
 * Mark an action as executed
 */
export async function markExecuted(
  actionId: string,
  userId: string,
  result: CainActionResult
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cain_pending_actions")
    .update({
      status: result.success ? "executed" : "failed",
      result: result.data || null,
      error: result.error || null,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/cain/actions");
  return { success: true };
}

/**
 * Mark stale pending actions as expired
 */
export async function expireStaleActions(
  userId: string,
  maxAgeHours: number = 24
): Promise<{ expiredCount: number; error?: string }> {
  const supabase = await createClient();

  const expiryThreshold = new Date();
  expiryThreshold.setHours(expiryThreshold.getHours() - maxAgeHours);

  const { data, error } = await supabase
    .from("cain_pending_actions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", expiryThreshold.toISOString())
    .select();

  if (error) return { expiredCount: 0, error: error.message };
  return { expiredCount: (data || []).length };
}

/**
 * Get action statistics for dashboard display
 */
export async function getActionStats(userId: string, orgId?: string | null): Promise<CainActionStats> {
  const supabase = await createClient();

  let pendingQuery = supabase
    .from("cain_pending_actions")
    .select("id, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (orgId) pendingQuery = pendingQuery.eq("organization_id", orgId);

  const { count: pendingCount = 0, data: pendingData } = await pendingQuery.order("created_at", { ascending: true }).limit(1);
  const pendingRows = pendingData ?? [];

  let failedQuery = supabase
    .from("cain_pending_actions")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "failed");

  if (orgId) failedQuery = failedQuery.eq("organization_id", orgId);

  const { count: failedCount = 0 } = await failedQuery;

  let executedQuery = supabase
    .from("cain_pending_actions")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "executed");

  if (orgId) executedQuery = executedQuery.eq("organization_id", orgId);

  const { count: executedCount = 0 } = await executedQuery;

  const oldestPending = pendingRows[0];

  return {
    pendingCount: pendingCount || 0,
    failedCount: failedCount || 0,
    executedCount: executedCount || 0,
    oldestPendingId: oldestPending?.id,
    oldestPendingCreatedAt: oldestPending?.created_at,
  };
}
