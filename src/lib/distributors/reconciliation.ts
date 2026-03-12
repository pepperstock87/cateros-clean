// Invoice ↔ Order Reconciliation Service
//
// Compares invoice line items against the original purchase order
// to detect pricing variances, quantity differences, substitutions,
// and unexpected charges. Flags discrepancies for review.

import { createClient } from "@/lib/supabase/server";
import { domainEvents } from "@/lib/events";
import type {
  DistributorOrderLine,
  DistributorInvoiceLine,
} from "./types";

export interface VarianceItem {
  invoiceLineId: string;
  orderLineId: string | null;
  sku: string;
  productName: string;
  type: "price" | "quantity" | "substitution" | "unexpected" | "missing";
  expected: number;
  actual: number;
  difference: number;
  details: string;
}

export interface ReconciliationResult {
  invoiceId: string;
  orderId: string;
  matchedLines: number;
  unmatchedInvoiceLines: number;
  missingOrderLines: number;
  variances: VarianceItem[];
  totalVarianceAmount: number;
  suggestedCredits: Array<{ reason: string; amount: number; sku: string }>;
}

/**
 * Reconcile an invoice against its linked purchase order.
 * Detects price variances, quantity differences, substitutions, and missing items.
 */
export async function reconcileInvoice(params: {
  userId: string;
  orgId: string | null;
  invoiceId: string;
  orderId: string;
}): Promise<ReconciliationResult> {
  const supabase = await createClient();

  // Load invoice lines
  const { data: invoiceLines } = await supabase
    .from("distributor_invoice_lines")
    .select("*")
    .eq("invoice_id", params.invoiceId);

  // Load order lines
  const { data: orderLines } = await supabase
    .from("distributor_order_lines")
    .select("*")
    .eq("order_id", params.orderId);

  const iLines = (invoiceLines ?? []) as DistributorInvoiceLine[];
  const oLines = (orderLines ?? []) as DistributorOrderLine[];

  // Build lookup by SKU
  const orderBySku = new Map<string, DistributorOrderLine>();
  for (const ol of oLines) {
    orderBySku.set(ol.sku, ol);
  }

  const variances: VarianceItem[] = [];
  const suggestedCredits: ReconciliationResult["suggestedCredits"] = [];
  const matchedOrderSkus = new Set<string>();
  let matchedLines = 0;
  let totalVarianceAmount = 0;

  for (const il of iLines) {
    const ol = orderBySku.get(il.sku);

    if (!ol) {
      // Check if this is a substitution
      const isSub = il.notes?.toLowerCase().includes("sub") ||
        iLines.some((other) => other.sku !== il.sku && orderBySku.has(other.sku));

      variances.push({
        invoiceLineId: il.id,
        orderLineId: null,
        sku: il.sku,
        productName: il.product_name,
        type: "unexpected",
        expected: 0,
        actual: il.extended_price,
        difference: il.extended_price,
        details: isSub
          ? `Possible substitution — ${il.product_name} was not on the original order`
          : `Item not on original order`,
      });
      totalVarianceAmount += il.extended_price;
      continue;
    }

    matchedOrderSkus.add(il.sku);
    matchedLines++;

    // Link invoice line to order line
    await supabase
      .from("distributor_invoice_lines")
      .update({ order_line_id: ol.id })
      .eq("id", il.id);

    // Check price variance
    if (Math.abs(il.unit_price - ol.unit_price) > 0.001) {
      const priceDiff = (il.unit_price - ol.unit_price) * il.quantity;
      variances.push({
        invoiceLineId: il.id,
        orderLineId: ol.id,
        sku: il.sku,
        productName: il.product_name,
        type: "price",
        expected: ol.unit_price,
        actual: il.unit_price,
        difference: priceDiff,
        details: `Unit price: ordered $${ol.unit_price.toFixed(4)}, invoiced $${il.unit_price.toFixed(4)} (${priceDiff > 0 ? "+" : ""}$${priceDiff.toFixed(2)})`,
      });
      totalVarianceAmount += priceDiff;

      if (priceDiff > 0.50) {
        suggestedCredits.push({
          reason: `Price overcharge on ${il.sku} — ${il.product_name}`,
          amount: Math.round(priceDiff * 100) / 100,
          sku: il.sku,
        });
      }
    }

    // Check quantity variance
    const orderedQty = ol.quantity_ordered;
    if (Math.abs(il.quantity - orderedQty) > 0.001) {
      const qtyDiff = (il.quantity - orderedQty) * il.unit_price;
      variances.push({
        invoiceLineId: il.id,
        orderLineId: ol.id,
        sku: il.sku,
        productName: il.product_name,
        type: "quantity",
        expected: orderedQty,
        actual: il.quantity,
        difference: qtyDiff,
        details: `Qty: ordered ${orderedQty}, invoiced ${il.quantity} (${il.quantity > orderedQty ? "over" : "short"})`,
      });
      totalVarianceAmount += qtyDiff;
    }
  }

  // Find missing order lines (ordered but not on invoice)
  const missingSkus = oLines.filter((ol) => !matchedOrderSkus.has(ol.sku));
  for (const ol of missingSkus) {
    variances.push({
      invoiceLineId: "",
      orderLineId: ol.id,
      sku: ol.sku,
      productName: ol.product_name,
      type: "missing",
      expected: ol.extended_price,
      actual: 0,
      difference: -ol.extended_price,
      details: `Ordered but not on invoice — may be backordered or dropped`,
    });
  }

  // Flag invoice lines with variances
  const flagIds = variances
    .filter((v) => v.invoiceLineId)
    .map((v) => v.invoiceLineId);

  if (flagIds.length > 0) {
    await supabase
      .from("distributor_invoice_lines")
      .update({ variance_flag: true })
      .in("id", flagIds);
  }

  // Link invoice to order
  await supabase
    .from("distributor_invoices")
    .update({ order_id: params.orderId, updated_at: new Date().toISOString() })
    .eq("id", params.invoiceId);

  // Emit reconciliation event
  if (variances.length > 0) {
    const { data: inv } = await supabase
      .from("distributor_invoices")
      .select("distributor_id")
      .eq("id", params.invoiceId)
      .single();

    if (inv) {
      await domainEvents.emit(
        "vendor.invoice.reconciled",
        {
          distributorId: inv.distributor_id,
          orgId: params.orgId,
          userId: params.userId,
          invoiceId: params.invoiceId,
          orderId: params.orderId,
          varianceCount: variances.length,
          totalVarianceAmount: Math.round(totalVarianceAmount * 100) / 100,
        },
        "distributors/reconciliation"
      );
    }
  }

  return {
    invoiceId: params.invoiceId,
    orderId: params.orderId,
    matchedLines,
    unmatchedInvoiceLines: iLines.length - matchedLines,
    missingOrderLines: missingSkus.length,
    variances,
    totalVarianceAmount: Math.round(totalVarianceAmount * 100) / 100,
    suggestedCredits,
  };
}

/**
 * Update received quantities on order lines from delivery data.
 */
export async function recordDelivery(params: {
  orderId: string;
  receivedItems: Array<{
    sku: string;
    quantityReceived: number;
    substitutionSku?: string;
    substitutionName?: string;
    notes?: string;
  }>;
}): Promise<{ updated: number; shortages: string[] }> {
  const supabase = await createClient();
  let updated = 0;
  const shortages: string[] = [];

  for (const item of params.receivedItems) {
    const { data: line } = await supabase
      .from("distributor_order_lines")
      .select("id, quantity_ordered, product_name")
      .eq("order_id", params.orderId)
      .eq("sku", item.sku)
      .maybeSingle();

    if (!line) continue;

    const updateData: Record<string, unknown> = {
      quantity_received: item.quantityReceived,
    };
    if (item.substitutionSku) updateData.substitution_sku = item.substitutionSku;
    if (item.substitutionName) updateData.substitution_name = item.substitutionName;
    if (item.notes) updateData.notes = item.notes;

    await supabase
      .from("distributor_order_lines")
      .update(updateData)
      .eq("id", line.id);

    updated++;

    if (item.quantityReceived < line.quantity_ordered) {
      shortages.push(`${line.product_name} (${item.sku}): ordered ${line.quantity_ordered}, received ${item.quantityReceived}`);
    }
  }

  return { updated, shortages };
}

/**
 * Get spending summary per distributor for a date range.
 */
export async function getSpendingSummary(params: {
  userId: string;
  orgId: string | null;
  startDate: string;
  endDate: string;
}): Promise<Array<{
  distributorId: string;
  distributorName: string;
  invoiceCount: number;
  totalSpend: number;
  creditTotal: number;
  netSpend: number;
}>> {
  const supabase = await createClient();

  // Get invoices in range
  let q = supabase
    .from("distributor_invoices")
    .select("distributor_id, total, distributors(name)")
    .eq("user_id", params.userId)
    .gte("invoice_date", params.startDate)
    .lte("invoice_date", params.endDate);

  if (params.orgId) q = q.eq("organization_id", params.orgId);

  const { data: invoices } = await q;

  // Get credits in range
  let cq = supabase
    .from("distributor_credits")
    .select("distributor_id, amount")
    .eq("user_id", params.userId)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate)
    .eq("status", "applied");

  if (params.orgId) cq = cq.eq("organization_id", params.orgId);

  const { data: credits } = await cq;

  // Aggregate
  const summary = new Map<string, {
    distributorName: string;
    invoiceCount: number;
    totalSpend: number;
    creditTotal: number;
  }>();

  for (const inv of invoices ?? []) {
    const distId = inv.distributor_id;
    const existing = summary.get(distId) || {
      distributorName: (inv as any).distributors?.name || "Unknown",
      invoiceCount: 0,
      totalSpend: 0,
      creditTotal: 0,
    };
    existing.invoiceCount++;
    existing.totalSpend += inv.total;
    summary.set(distId, existing);
  }

  for (const cr of credits ?? []) {
    const existing = summary.get(cr.distributor_id);
    if (existing) existing.creditTotal += cr.amount;
  }

  return [...summary.entries()].map(([distributorId, data]) => ({
    distributorId,
    distributorName: data.distributorName,
    invoiceCount: data.invoiceCount,
    totalSpend: Math.round(data.totalSpend * 100) / 100,
    creditTotal: Math.round(data.creditTotal * 100) / 100,
    netSpend: Math.round((data.totalSpend - data.creditTotal) * 100) / 100,
  }));
}
