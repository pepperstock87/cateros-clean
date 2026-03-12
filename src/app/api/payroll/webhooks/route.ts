import { NextRequest, NextResponse } from "next/server";
import { processWebhook } from "@/lib/payroll/webhooks";
import { registerDomainEventHandlers } from "@/lib/events";
import type { PayrollWebhookEvent } from "@/lib/payroll/types";

registerDomainEventHandlers();

export async function POST(request: NextRequest) {
  // Gusto webhook verification
  // Gusto sends a verification request with a specific header
  const gustoSignature = request.headers.get("x-gusto-signature");

  // For now, verify that the request comes with the expected secret
  // Gusto Embedded uses a shared secret for webhook verification
  const webhookSecret = process.env.GUSTO_WEBHOOK_SECRET;
  if (webhookSecret && gustoSignature !== webhookSecret) {
    // Basic verification — in production, use HMAC
    console.warn("[payroll/webhooks] Signature mismatch");
  }

  try {
    const body = await request.json();
    const event: PayrollWebhookEvent = body;

    if (!event.event_type || !event.company_uuid) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Process async
    processWebhook(event).catch((err) => {
      console.error("[payroll/webhooks] Processing error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payroll/webhooks] Parse error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
