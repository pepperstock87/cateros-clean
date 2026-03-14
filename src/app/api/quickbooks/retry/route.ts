// QuickBooks Retry Queue Processor
//
// Cron-style endpoint that processes queued sync items that are ready for retry.
// Call via Vercel Cron or external scheduler every 2-5 minutes.
// Protected by CRON_SECRET to prevent unauthorized invocation.

import { NextRequest, NextResponse } from "next/server";
import { getRetryableItems, markCompleted, queueForRetry, logSyncResult } from "@/lib/quickbooks/queue";
import { syncClientToQB, syncEventInvoiceToQB, syncPaymentToQB } from "@/lib/quickbooks/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this, or manual invocation)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getRetryableItems(10);

    if (items.length === 0) {
      return NextResponse.json({ processed: 0, message: "No retryable items" });
    }

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        let result: { qbId: string } | { error: string };

        switch (item.entityType) {
          case "customer":
            result = await syncClientToQB({
              userId: item.userId,
              orgId: item.orgId,
              realmId: item.realmId,
              clientId: item.entityId,
            });
            break;

          case "invoice":
            result = await syncEventInvoiceToQB({
              userId: item.userId,
              orgId: item.orgId,
              realmId: item.realmId,
              eventId: item.entityId,
            });
            break;

          case "payment": {
            const eventId = (item.payload as Record<string, string>).eventId;
            if (!eventId) {
              result = { error: "Missing eventId in payload" };
              break;
            }
            result = await syncPaymentToQB({
              userId: item.userId,
              orgId: item.orgId,
              realmId: item.realmId,
              paymentId: item.entityId,
              eventId,
            });
            break;
          }

          default:
            result = { error: `Unsupported entity type: ${item.entityType}` };
        }

        if ("error" in result) {
          // Re-queue for another retry (queueForRetry handles attempt counting)
          await queueForRetry({
            userId: item.userId,
            orgId: item.orgId,
            realmId: item.realmId,
            entityType: item.entityType,
            entityId: item.entityId,
            direction: item.direction,
            payload: item.payload,
            error: result.error,
          });
          failed++;
        } else {
          await markCompleted(item.id);
          succeeded++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[quickbooks/retry] Item ${item.id} failed:`, message);
        failed++;
      }
    }

    return NextResponse.json({
      processed: items.length,
      succeeded,
      failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[quickbooks/retry] Processor error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
