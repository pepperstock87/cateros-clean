// QuickBooks Sync Queue & Logging
//
// Handles retry logic for failed syncs and maintains sync history.
// Failed operations are queued with exponential backoff.

import { createClient } from "@/lib/supabase/server";
import type { QBEntityType, QBSyncDirection, QBSyncStatus } from "./types";

const MAX_RETRY_ATTEMPTS = 5;

// ─── Sync Logging ───

export async function logSyncResult(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  entityType: QBEntityType;
  entityId: string;
  direction: QBSyncDirection;
  status: QBSyncStatus;
  errorMessage?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("qb_sync_logs").insert({
      user_id: params.userId,
      organization_id: params.orgId,
      realm_id: params.realmId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      direction: params.direction,
      status: params.status,
      error_message: params.errorMessage || null,
      details: params.details || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[quickbooks/queue] Failed to log sync result:", err);
  }
}

// ─── Retry Queue ───

/**
 * Queue a failed sync operation for retry with exponential backoff.
 */
export async function queueForRetry(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  entityType: QBEntityType;
  entityId: string;
  direction: QBSyncDirection;
  payload: Record<string, unknown>;
  error: string;
}): Promise<void> {
  try {
    const supabase = await createClient();

    // Check for existing queue item
    const { data: existing } = await supabase
      .from("qb_sync_queue")
      .select("id, attempts")
      .eq("user_id", params.userId)
      .eq("entity_type", params.entityType)
      .eq("entity_id", params.entityId)
      .eq("direction", params.direction)
      .in("status", ["queued", "processing"])
      .maybeSingle();

    if (existing) {
      const newAttempts = existing.attempts + 1;
      if (newAttempts >= MAX_RETRY_ATTEMPTS) {
        // Mark as permanently failed
        await supabase
          .from("qb_sync_queue")
          .update({
            status: "failed",
            attempts: newAttempts,
            last_error: params.error,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        return;
      }

      // Exponential backoff: 1m, 5m, 25m, 2h
      const backoffMs = Math.pow(5, newAttempts) * 60 * 1000;
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from("qb_sync_queue")
        .update({
          attempts: newAttempts,
          next_retry_at: nextRetry,
          last_error: params.error,
          status: "queued",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new queue item
      const nextRetry = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute

      await supabase.from("qb_sync_queue").insert({
        user_id: params.userId,
        organization_id: params.orgId,
        realm_id: params.realmId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        direction: params.direction,
        payload: params.payload,
        attempts: 1,
        max_attempts: MAX_RETRY_ATTEMPTS,
        next_retry_at: nextRetry,
        last_error: params.error,
        status: "queued",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[quickbooks/queue] Failed to queue retry:", err);
  }
}

/**
 * Get pending items ready for retry.
 * Called by a cron job or background worker.
 */
export async function getRetryableItems(limit = 10): Promise<
  Array<{
    id: string;
    userId: string;
    orgId: string | null;
    realmId: string;
    entityType: QBEntityType;
    entityId: string;
    direction: QBSyncDirection;
    payload: Record<string, unknown>;
    attempts: number;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qb_sync_queue")
    .select("*")
    .eq("status", "queued")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    orgId: item.organization_id,
    realmId: item.realm_id,
    entityType: item.entity_type,
    entityId: item.entity_id,
    direction: item.direction,
    payload: item.payload,
    attempts: item.attempts,
  }));
}

/**
 * Mark a queue item as completed after successful retry.
 */
export async function markCompleted(queueItemId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("qb_sync_queue")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", queueItemId);
}

/**
 * Get recent sync logs for display in the UI.
 */
export async function getRecentSyncLogs(params: {
  userId: string;
  orgId: string | null;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    entityType: QBEntityType;
    entityId: string;
    direction: QBSyncDirection;
    status: QBSyncStatus;
    errorMessage: string | null;
    createdAt: string;
  }>
> {
  const supabase = await createClient();
  let q = supabase
    .from("qb_sync_logs")
    .select("*")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (params.orgId) q = q.eq("organization_id", params.orgId);

  const { data } = await q;

  return (data ?? []).map((log) => ({
    id: log.id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    direction: log.direction,
    status: log.status,
    errorMessage: log.error_message,
    createdAt: log.created_at,
  }));
}
