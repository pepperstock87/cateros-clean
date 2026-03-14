"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getConnection } from "@/lib/quickbooks/auth";
import { getRecentSyncLogs } from "@/lib/quickbooks/queue";
import type { QBSyncStatus, QBEntityType, QBSyncDirection } from "@/lib/quickbooks/types";

export interface QBStatusData {
  connected: boolean;
  companyName: string | null;
  realmId: string | null;
  lastSynced: string | null;
  recentLogs: Array<{
    id: string;
    entityType: QBEntityType;
    entityId: string;
    direction: QBSyncDirection;
    status: QBSyncStatus;
    errorMessage: string | null;
    createdAt: string;
  }>;
  queuedCount: number;
  failedCount: number;
}

export async function getQBStatus(): Promise<QBStatusData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false, companyName: null, realmId: null, lastSynced: null, recentLogs: [], queuedCount: 0, failedCount: 0 };

  const org = await getCurrentOrg();
  const orgId = org?.orgId || null;
  const connection = await getConnection(user.id, orgId);

  if (!connection) {
    return { connected: false, companyName: null, realmId: null, lastSynced: null, recentLogs: [], queuedCount: 0, failedCount: 0 };
  }

  const [recentLogs, queuedRes, failedRes] = await Promise.all([
    getRecentSyncLogs({ userId: user.id, orgId, limit: 20 }),
    supabase
      .from("qb_sync_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "queued"),
    supabase
      .from("qb_sync_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "failed"),
  ]);

  return {
    connected: true,
    companyName: connection.company_name,
    realmId: connection.realm_id,
    lastSynced: connection.last_synced_at,
    recentLogs,
    queuedCount: queuedRes.count ?? 0,
    failedCount: failedRes.count ?? 0,
  };
}

export async function retryFailedSyncs(): Promise<{ retriggered: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { retriggered: 0, error: "Unauthorized" };

  // Reset failed items back to queued with next_retry_at = now
  const { data, error } = await supabase
    .from("qb_sync_queue")
    .update({
      status: "queued",
      next_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "failed")
    .select("id");

  if (error) return { retriggered: 0, error: error.message };
  return { retriggered: data?.length ?? 0 };
}
