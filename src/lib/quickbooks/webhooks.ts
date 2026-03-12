// QuickBooks Webhook Handler
//
// QBO sends webhooks for entity changes. We use these to detect
// changes made directly in QBO that need to be reflected in Cateros.
// Webhook verification uses HMAC-SHA256 with the webhook verifier token.

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCaterosId } from "./mapping";
import { logSyncResult } from "./queue";

export interface QBWebhookPayload {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string; // "Customer", "Invoice", "Payment"
        id: string;
        operation: "Create" | "Update" | "Delete" | "Void";
        lastUpdated: string;
      }>;
    };
  }>;
}

/**
 * Verify the webhook signature from Intuit.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    console.error("[quickbooks/webhooks] QBO_WEBHOOK_VERIFIER_TOKEN not configured");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", verifierToken)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

/**
 * Process a verified webhook payload.
 * For now, we log changes and flag entities that may be out of sync.
 * Full bidirectional sync from QBO→Cateros is a future enhancement.
 */
export async function processWebhook(payload: QBWebhookPayload): Promise<void> {
  const supabase = await createClient();

  for (const notification of payload.eventNotifications) {
    const realmId = notification.realmId;

    // Find the user associated with this realm
    const { data: connection } = await supabase
      .from("qb_connections")
      .select("user_id, organization_id")
      .eq("realm_id", realmId)
      .eq("is_active", true)
      .maybeSingle();

    if (!connection) continue;

    for (const entity of notification.dataChangeEvent.entities) {
      const entityType = mapQBEntityName(entity.name);
      if (!entityType) continue;

      // Look up the Cateros entity
      const caterosId = await getCaterosId({
        userId: connection.user_id,
        entityType,
        qbId: entity.id,
        realmId,
      });

      // Log the webhook event
      await logSyncResult({
        userId: connection.user_id,
        orgId: connection.organization_id,
        realmId,
        entityType,
        entityId: caterosId || `qb:${entity.id}`,
        direction: "qb_to_cateros",
        status: "success",
        details: {
          operation: entity.operation,
          qbId: entity.id,
          lastUpdated: entity.lastUpdated,
          caterosId,
          webhookOnly: true, // Flag that this was a notification, not a full sync
        },
      });

      // Future: For Update/Delete operations on mapped entities,
      // queue a reverse sync to pull changes from QBO into Cateros.
      // For now, we just log so the user can see what changed in QBO.
    }
  }
}

function mapQBEntityName(name: string): "customer" | "invoice" | "payment" | null {
  switch (name) {
    case "Customer":
      return "customer";
    case "Invoice":
      return "invoice";
    case "Payment":
      return "payment";
    default:
      return null;
  }
}
