// QuickBooks Bidirectional Sync Service
//
// Handles syncing customers, invoices, and payments between Cateros and QBO.
// Uses ID mappings to track which entities have been synced.
// Uses hash comparison to detect changes and avoid unnecessary updates.
// Failed syncs are queued for retry.

import { createClient } from "@/lib/supabase/server";
import { QuickBooksClient } from "./client";
import { getQBId, upsertMapping, hasChanged } from "./mapping";
import { logSyncResult, queueForRetry } from "./queue";
import type {
  QBCustomer,
  QBInvoice,
  QBInvoiceLine,
  QBPayment,
  QBSyncDirection,
} from "./types";

// ─── Customer Sync ───

/**
 * Sync a Cateros client to QBO as a Customer.
 * Creates if new, updates if changed.
 */
export async function syncClientToQB(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  clientId: string;
}): Promise<{ qbId: string } | { error: string }> {
  const supabase = await createClient();
  const qb = await QuickBooksClient.fromUser(params.userId, params.orgId);
  if (!qb) return { error: "No active QuickBooks connection" };

  // Fetch the Cateros client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.clientId)
    .eq("user_id", params.userId)
    .single();

  if (!client) return { error: "Client not found" };

  const syncData = {
    firstName: client.first_name,
    lastName: client.last_name,
    company: client.company_name,
    email: client.email,
    phone: client.phone,
  };

  try {
    const existingQBId = await getQBId({
      userId: params.userId,
      entityType: "customer",
      caterosId: params.clientId,
      realmId: params.realmId,
    });

    const customerData: QBCustomer = {
      DisplayName: `${client.first_name} ${client.last_name}`.trim(),
      GivenName: client.first_name,
      FamilyName: client.last_name,
      CompanyName: client.company_name || undefined,
      PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
      PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    };

    let qbId: string;

    if (existingQBId) {
      // Check if data changed
      const changed = await hasChanged({
        userId: params.userId,
        entityType: "customer",
        caterosId: params.clientId,
        realmId: params.realmId,
        currentData: syncData,
      });

      if (!changed) {
        await logSyncResult({
          userId: params.userId,
          orgId: params.orgId,
          realmId: params.realmId,
          entityType: "customer",
          entityId: params.clientId,
          direction: "cateros_to_qb",
          status: "skipped",
          details: { reason: "no_changes" },
        });
        return { qbId: existingQBId };
      }

      // Update existing customer
      const existing = await qb.getCustomer(existingQBId);
      const updated = await qb.updateCustomer({
        ...customerData,
        Id: existingQBId,
        SyncToken: existing.SyncToken,
      });
      qbId = updated.Id!;
    } else {
      // Create new customer
      const created = await qb.createCustomer(customerData);
      qbId = created.Id!;
    }

    // Update mapping
    await upsertMapping({
      userId: params.userId,
      orgId: params.orgId,
      entityType: "customer",
      caterosId: params.clientId,
      qbId,
      realmId: params.realmId,
      syncData,
    });

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "customer",
      entityId: params.clientId,
      direction: "cateros_to_qb",
      status: "success",
      details: { qbId, action: existingQBId ? "updated" : "created" },
    });

    return { qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "customer",
      entityId: params.clientId,
      direction: "cateros_to_qb",
      status: "failed",
      errorMessage: message,
    });

    await queueForRetry({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "customer",
      entityId: params.clientId,
      direction: "cateros_to_qb",
      payload: syncData,
      error: message,
    });

    return { error: message };
  }
}

// ─── Invoice Sync ───

/**
 * Sync a Cateros event's pricing as a QBO Invoice.
 * The event's client must already be synced to QBO.
 */
export async function syncEventInvoiceToQB(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  eventId: string;
}): Promise<{ qbId: string } | { error: string }> {
  const supabase = await createClient();
  const qb = await QuickBooksClient.fromUser(params.userId, params.orgId);
  if (!qb) return { error: "No active QuickBooks connection" };

  // Fetch event with pricing
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .eq("user_id", params.userId)
    .single();

  if (!event) return { error: "Event not found" };
  if (!event.pricing_data) return { error: "Event has no pricing data" };

  const pricing = event.pricing_data;

  // Get or sync the customer
  let customerQBId: string | null = null;
  if (event.client_id) {
    customerQBId = await getQBId({
      userId: params.userId,
      entityType: "customer",
      caterosId: event.client_id,
      realmId: params.realmId,
    });

    if (!customerQBId) {
      // Auto-sync the client first
      const clientResult = await syncClientToQB({
        userId: params.userId,
        orgId: params.orgId,
        realmId: params.realmId,
        clientId: event.client_id,
      });
      if ("error" in clientResult) return { error: `Client sync failed: ${clientResult.error}` };
      customerQBId = clientResult.qbId;
    }
  }

  if (!customerQBId) {
    // Create a minimal customer from event client_name
    try {
      const created = await qb.createCustomer({
        DisplayName: event.client_name || "Unknown Client",
      });
      customerQBId = created.Id!;
    } catch (err) {
      return { error: `Failed to create QBO customer: ${err instanceof Error ? err.message : "Unknown"}` };
    }
  }

  try {
    // Build invoice lines
    const lines: QBInvoiceLine[] = [];

    // Menu items
    for (const item of pricing.menuItems ?? []) {
      lines.push({
        Amount: item.costPerPerson * item.quantity,
        Description: `${item.name} (${item.quantity} guests)`,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          UnitPrice: item.costPerPerson,
          Qty: item.quantity,
        },
      });
    }

    // Staffing
    for (const staff of pricing.staffing ?? []) {
      lines.push({
        Amount: staff.hourlyRate * staff.hours * staff.headcount,
        Description: `${staff.role} (${staff.headcount}x, ${staff.hours}h @ $${staff.hourlyRate}/hr)`,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          UnitPrice: staff.hourlyRate * staff.hours,
          Qty: staff.headcount,
        },
      });
    }

    // Rentals
    for (const rental of pricing.rentals ?? []) {
      lines.push({
        Amount: rental.unitCost * rental.quantity,
        Description: `${rental.item} (x${rental.quantity})`,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          UnitPrice: rental.unitCost,
          Qty: rental.quantity,
        },
      });
    }

    // Admin fee
    if (pricing.adminFee > 0) {
      lines.push({
        Amount: pricing.adminFee,
        Description: `Admin/Overhead Fee (${pricing.adminPercent}%)`,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: { UnitPrice: pricing.adminFee, Qty: 1 },
      });
    }

    const invoiceData: QBInvoice = {
      CustomerRef: { value: customerQBId },
      Line: lines,
      TxnDate: new Date().toISOString().split("T")[0],
      DueDate: event.event_date,
      DocNumber: `CAT-${event.id.slice(0, 8).toUpperCase()}`,
      PrivateNote: `Cateros Event: ${event.name} (${event.guest_count} guests, ${event.event_date})`,
    };

    const existingQBId = await getQBId({
      userId: params.userId,
      entityType: "invoice",
      caterosId: params.eventId,
      realmId: params.realmId,
    });

    let qbId: string;

    if (existingQBId) {
      // Void old and create new (QBO doesn't allow full invoice updates easily)
      try {
        const existing = await qb.getInvoice(existingQBId);
        if (existing.Balance === existing.TotalAmt) {
          // Only void if unpaid
          await qb.voidInvoice(existingQBId, existing.SyncToken);
        }
      } catch {
        // Old invoice may already be voided
      }
      const created = await qb.createInvoice(invoiceData);
      qbId = created.Id!;
    } else {
      const created = await qb.createInvoice(invoiceData);
      qbId = created.Id!;
    }

    await upsertMapping({
      userId: params.userId,
      orgId: params.orgId,
      entityType: "invoice",
      caterosId: params.eventId,
      qbId,
      realmId: params.realmId,
      syncData: { suggestedPrice: pricing.suggestedPrice, lineCount: lines.length },
    });

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "invoice",
      entityId: params.eventId,
      direction: "cateros_to_qb",
      status: "success",
      details: { qbId, lineCount: lines.length, total: pricing.suggestedPrice },
    });

    return { qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "invoice",
      entityId: params.eventId,
      direction: "cateros_to_qb",
      status: "failed",
      errorMessage: message,
    });

    await queueForRetry({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "invoice",
      entityId: params.eventId,
      direction: "cateros_to_qb",
      payload: { eventId: params.eventId },
      error: message,
    });

    return { error: message };
  }
}

// ─── Payment Sync ───

/**
 * Sync a Cateros payment to QBO.
 * Requires the invoice to already be synced.
 */
export async function syncPaymentToQB(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  paymentId: string;
  eventId: string;
}): Promise<{ qbId: string } | { error: string }> {
  const supabase = await createClient();
  const qb = await QuickBooksClient.fromUser(params.userId, params.orgId);
  if (!qb) return { error: "No active QuickBooks connection" };

  // Fetch payment
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", params.paymentId)
    .single();

  if (!payment) return { error: "Payment not found" };

  // Get the QBO invoice ID
  const invoiceQBId = await getQBId({
    userId: params.userId,
    entityType: "invoice",
    caterosId: params.eventId,
    realmId: params.realmId,
  });

  // Get the QBO customer ID
  const { data: event } = await supabase
    .from("events")
    .select("client_id, client_name")
    .eq("id", params.eventId)
    .single();

  let customerQBId: string | null = null;
  if (event?.client_id) {
    customerQBId = await getQBId({
      userId: params.userId,
      entityType: "customer",
      caterosId: event.client_id,
      realmId: params.realmId,
    });
  }

  if (!customerQBId) {
    return { error: "Customer not synced to QuickBooks. Sync the client first." };
  }

  try {
    const paymentData: QBPayment = {
      CustomerRef: { value: customerQBId },
      TotalAmt: payment.amount,
      TxnDate: payment.paid_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      PrivateNote: `Cateros payment for event (${payment.payment_method_type || "unknown method"})`,
    };

    // Link to invoice if synced
    if (invoiceQBId) {
      paymentData.Line = [
        {
          Amount: payment.amount,
          LinkedTxn: [{ TxnId: invoiceQBId, TxnType: "Invoice" }],
        },
      ];
    }

    const created = await qb.createPayment(paymentData);
    const qbId = created.Id!;

    await upsertMapping({
      userId: params.userId,
      orgId: params.orgId,
      entityType: "payment",
      caterosId: params.paymentId,
      qbId,
      realmId: params.realmId,
      syncData: { amount: payment.amount },
    });

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "payment",
      entityId: params.paymentId,
      direction: "cateros_to_qb",
      status: "success",
      details: { qbId, amount: payment.amount },
    });

    return { qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await logSyncResult({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "payment",
      entityId: params.paymentId,
      direction: "cateros_to_qb",
      status: "failed",
      errorMessage: message,
    });

    await queueForRetry({
      userId: params.userId,
      orgId: params.orgId,
      realmId: params.realmId,
      entityType: "payment",
      entityId: params.paymentId,
      direction: "cateros_to_qb",
      payload: { paymentId: params.paymentId, eventId: params.eventId },
      error: message,
    });

    return { error: message };
  }
}
