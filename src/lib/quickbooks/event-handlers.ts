// QuickBooks Domain Event Handlers
//
// Listens to domain events and triggers QBO sync when relevant.
// Only syncs if the user has an active QBO connection.
// All sync operations are fire-and-forget to avoid blocking core flows.

import { domainEvents } from "@/lib/events";
import { getConnection } from "./auth";
import { syncClientToQB, syncPaymentToQB } from "./sync";

let registered = false;

export function registerQBEventHandlers() {
  if (registered) return;
  registered = true;

  // Auto-sync payments to QBO when received
  domainEvents.on("payment.received", async (e) => {
    const p = e.payload;
    const conn = await getConnection(p.userId, p.orgId);
    if (!conn) return; // No QBO connection, skip

    // Fire-and-forget — don't block the payment flow
    syncPaymentToQB({
      userId: p.userId,
      orgId: p.orgId,
      realmId: conn.realm_id,
      paymentId: p.paymentId,
      eventId: p.eventId,
    }).catch((err) => {
      console.error("[quickbooks/events] Auto-sync payment failed:", err);
    });
  });

  // When a proposal is accepted/signed, we might want to create the invoice
  // But this should be user-confirmed, not auto-executed.
  // For now, log it so the UI can prompt the user.
  domainEvents.on("proposal.responded", async (e) => {
    if (e.payload.action !== "accepted" && e.payload.action !== "signed") return;

    const conn = await getConnection(e.payload.userId, e.payload.orgId);
    if (!conn) return;

    // Log that an invoice could be synced — the UI will show a prompt
    console.log(
      `[quickbooks/events] Proposal ${e.payload.action} for event ${e.payload.eventId}. ` +
      `QBO invoice sync available — user should confirm.`
    );
  });
}
