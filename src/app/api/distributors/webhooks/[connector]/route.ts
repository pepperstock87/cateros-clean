import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { registerDomainEventHandlers } from "@/lib/events";

registerDomainEventHandlers();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connector: string }> }
) {
  const { connector } = await params;
  const rawBody = await request.text();

  // Verify webhook signature if configured
  const signatureHeader = request.headers.get("x-webhook-signature");
  const webhookSecret = process.env[`DISTRIBUTOR_WEBHOOK_SECRET_${connector.toUpperCase()}`];

  if (webhookSecret) {
    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader, "utf8"),
        Buffer.from(expected, "utf8")
      );
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(rawBody);

    // Log the webhook for auditing
    const supabase = await createClient();
    await supabase.from("distributor_webhook_logs").insert({
      connector_type: connector,
      event_type: payload.event_type || payload.type || "unknown",
      payload,
      received_at: new Date().toISOString(),
    }).then(() => {}, () => {
      // Table may not exist yet — fail silently
    });

    console.log(
      `[distributors/webhooks] ${connector}: ${payload.event_type || payload.type || "unknown"}`
    );

    // Always return 200 to prevent webhook retries from external systems
    return NextResponse.json({
      received: true,
      connector,
    });
  } catch (err) {
    console.error(`[distributors/webhooks] ${connector}: Parse error`, err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
