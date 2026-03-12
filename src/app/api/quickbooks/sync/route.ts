import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { getConnection } from "@/lib/quickbooks/auth";
import { syncClientToQB, syncEventInvoiceToQB, syncPaymentToQB } from "@/lib/quickbooks/sync";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getCurrentOrg();
  const connection = await getConnection(user.id, org?.orgId || null);

  if (!connection) {
    return NextResponse.json(
      { error: "No active QuickBooks connection" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action, entityId, eventId } = body as {
    action: "sync_client" | "sync_invoice" | "sync_payment";
    entityId: string;
    eventId?: string;
  };

  if (!action || !entityId) {
    return NextResponse.json(
      { error: "action and entityId are required" },
      { status: 400 }
    );
  }

  try {
    let result: { qbId: string } | { error: string };

    switch (action) {
      case "sync_client":
        result = await syncClientToQB({
          userId: user.id,
          orgId: org?.orgId || null,
          realmId: connection.realm_id,
          clientId: entityId,
        });
        break;

      case "sync_invoice":
        result = await syncEventInvoiceToQB({
          userId: user.id,
          orgId: org?.orgId || null,
          realmId: connection.realm_id,
          eventId: entityId,
        });
        break;

      case "sync_payment":
        if (!eventId) {
          return NextResponse.json(
            { error: "eventId is required for payment sync" },
            { status: 400 }
          );
        }
        result = await syncPaymentToQB({
          userId: user.id,
          orgId: org?.orgId || null,
          realmId: connection.realm_id,
          paymentId: entityId,
          eventId,
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, qbId: result.qbId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
