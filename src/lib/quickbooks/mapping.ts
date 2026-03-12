// QuickBooks ID Mapping
//
// Maintains a bidirectional mapping between Cateros entity IDs and QBO entity IDs.
// Used to avoid duplicate creation and enable update sync.

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import type { QBEntityType, QBIdMapping } from "./types";

/**
 * Get the QBO ID for a Cateros entity.
 */
export async function getQBId(params: {
  userId: string;
  entityType: QBEntityType;
  caterosId: string;
  realmId: string;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qb_id_mappings")
    .select("qb_id")
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("cateros_id", params.caterosId)
    .eq("realm_id", params.realmId)
    .maybeSingle();

  return data?.qb_id ?? null;
}

/**
 * Get the Cateros ID for a QBO entity.
 */
export async function getCaterosId(params: {
  userId: string;
  entityType: QBEntityType;
  qbId: string;
  realmId: string;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qb_id_mappings")
    .select("cateros_id")
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("qb_id", params.qbId)
    .eq("realm_id", params.realmId)
    .maybeSingle();

  return data?.cateros_id ?? null;
}

/**
 * Create or update an ID mapping.
 */
export async function upsertMapping(params: {
  userId: string;
  orgId: string | null;
  entityType: QBEntityType;
  caterosId: string;
  qbId: string;
  realmId: string;
  syncData?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const syncHash = params.syncData
    ? crypto.createHash("sha256").update(JSON.stringify(params.syncData)).digest("hex")
    : null;

  await supabase.from("qb_id_mappings").upsert(
    {
      user_id: params.userId,
      organization_id: params.orgId,
      entity_type: params.entityType,
      cateros_id: params.caterosId,
      qb_id: params.qbId,
      realm_id: params.realmId,
      sync_hash: syncHash,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entity_type,cateros_id,realm_id" }
  );
}

/**
 * Remove a mapping (e.g., when deleting a Cateros entity).
 */
export async function removeMapping(params: {
  userId: string;
  entityType: QBEntityType;
  caterosId: string;
  realmId: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("qb_id_mappings")
    .delete()
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("cateros_id", params.caterosId)
    .eq("realm_id", params.realmId);
}

/**
 * Check if data has changed since last sync using hash comparison.
 * Returns true if data is different (needs sync).
 */
export async function hasChanged(params: {
  userId: string;
  entityType: QBEntityType;
  caterosId: string;
  realmId: string;
  currentData: Record<string, unknown>;
}): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qb_id_mappings")
    .select("sync_hash")
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("cateros_id", params.caterosId)
    .eq("realm_id", params.realmId)
    .maybeSingle();

  if (!data?.sync_hash) return true; // No previous sync — needs sync

  const currentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(params.currentData))
    .digest("hex");

  return currentHash !== data.sync_hash;
}
