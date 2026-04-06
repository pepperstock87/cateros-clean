import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processWebhook } from "@/lib/payroll/webhooks";
import { registerDomainEventHandlers } from "@/lib/events";
import type { PayrollWebhookEvent } from "@/lib/payroll/types";

registerDomainEventHandlers();

function verifyGustoSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.GUSTO_WEBHOOK_SECRET;
  if (!secret) throw new Error("GUSTO_WEBHOOK_SECRET is not configured");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8")
  );
}

export async function POST(request: NextRequest) {
  const gustoSignature = request.headers.get("x-gusto-signature");
  const rawBody = await request.text();

  // HMAC-SHA256 verification
  if (gustoSignature) {
    if (!verifyGustoSignature(rawBody, gustoSignature)) {
      console.warn("[payroll/webhooks] HMAC signature mismatch — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.GUSTO_WEBHOOK_SECRET) {
    // Signature header missing but secret is configured — reject
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const event: PayrollWebhookEvent = JSON.parse(rawBody);

    if (!event.event_type || !event.company_uuid) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Process async — respond immediately to Gusto
    processWebhook(event).catch((err) => {
      console.error("[payroll/webhooks] Processing error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payroll/webhooks] Parse error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
