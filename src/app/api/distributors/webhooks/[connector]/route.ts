import { NextRequest, NextResponse } from "next/server";

// Dynamic webhook receiver for future distributor webhook integrations.
// Each connector type gets its own endpoint: /api/distributors/webhooks/sysco, etc.
// The connector handles signature verification and payload processing.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connector: string }> }
) {
  const { connector } = await params;

  // Future: look up the connector and delegate webhook processing
  // For now, log and acknowledge
  console.log(`[distributors/webhooks] Received webhook for connector: ${connector}`);

  const body = await request.text();
  console.log(`[distributors/webhooks] Payload size: ${body.length} bytes`);

  // Always return 200 to prevent webhook retries from external systems
  return NextResponse.json({
    received: true,
    connector,
    message: `Webhook handler for ${connector} is not yet active`,
  });
}
