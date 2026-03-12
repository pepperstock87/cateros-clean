import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, processWebhook, type QBWebhookPayload } from "@/lib/quickbooks/webhooks";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("intuit-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();

  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload: QBWebhookPayload = JSON.parse(rawBody);
    // Process async — respond immediately to Intuit
    processWebhook(payload).catch((err) => {
      console.error("[quickbooks/webhooks] Processing error:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[quickbooks/webhooks] Parse error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
