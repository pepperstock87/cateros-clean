// Domain Event Handlers
//
// Wires domain events to existing subsystems (audit, activity, notifications).
// This is the "glue" layer — it subscribes to domain events and calls existing
// functions, replacing the need for each business action to manually call
// logAudit + logActivity + createNotification inline.
//
// Call `registerDomainEventHandlers()` once at app startup.

import { domainEvents } from "./bus";
import { logAudit } from "@/lib/audit";
import { logActivity } from "@/lib/activity";

let registered = false;

export function registerDomainEventHandlers() {
  if (registered) return;
  registered = true;

  // ─── Event Lifecycle ───

  domainEvents.on("event.created", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "event_created",
      `Event "${p.eventName}" created (${p.source})`,
      { client: p.clientName, guestCount: p.guestCount, source: p.source }
    );
    logAudit({
      userId: p.userId,
      action: "create",
      entity: "event",
      entityId: p.eventId,
      entityName: p.eventName,
      details: { source: p.source, guestCount: p.guestCount },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("event.status_changed", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "status_change",
      `Status changed from ${p.fromStatus} to ${p.toStatus}`,
      { fromStatus: p.fromStatus, toStatus: p.toStatus }
    );
    logAudit({
      userId: p.userId,
      action: "status_change",
      entity: "event",
      entityId: p.eventId,
      details: { from: p.fromStatus, to: p.toStatus },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("event.updated", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "event_updated",
      `Event updated: ${Object.keys(p.changes).join(", ")}`,
      { changes: p.changes }
    );
    logAudit({
      userId: p.userId,
      action: "update",
      entity: "event",
      entityId: p.eventId,
      details: { changes: p.changes },
      organizationId: p.orgId,
    });
  });

  // ─── Staffing ───

  domainEvents.on("staffing.plan.updated", async (e) => {
    const p = e.payload;
    const added = p.assignments.filter((a) => a.action === "added").length;
    const removed = p.assignments.filter((a) => a.action === "removed").length;
    const desc = [
      added > 0 ? `${added} assigned` : null,
      removed > 0 ? `${removed} removed` : null,
    ]
      .filter(Boolean)
      .join(", ");

    await logActivity(
      p.eventId,
      p.userId,
      "staff_assigned",
      `Staffing updated: ${desc}`,
      { assignments: p.assignments }
    );
  });

  // ─── Payments ───

  domainEvents.on("payment.received", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "payment_added",
      `Payment of $${p.amount.toFixed(2)} received via ${p.method}`,
      {
        paymentId: p.paymentId,
        amount: p.amount,
        method: p.method,
        isDeposit: p.isDeposit,
      }
    );
    logAudit({
      userId: p.userId,
      action: "payment_received",
      entity: "payment",
      entityId: p.paymentId,
      details: {
        eventId: p.eventId,
        amount: p.amount,
        method: p.method,
        totalPaid: p.totalPaid,
        totalDue: p.totalDue,
      },
      organizationId: p.orgId,
    });
  });

  // ─── Proposals ───

  domainEvents.on("proposal.sent", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "proposal_sent",
      `Proposal sent to ${p.clientName} (${p.clientEmail})`,
      { proposalId: p.proposalId, amount: p.amount }
    );
    logAudit({
      userId: p.userId,
      action: "send_proposal",
      entity: "proposal",
      entityId: p.proposalId,
      details: { clientEmail: p.clientEmail, amount: p.amount },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("proposal.responded", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "proposal_responded",
      `${p.clientName} ${p.action} the proposal`,
      { proposalId: p.proposalId, action: p.action }
    );
    logAudit({
      userId: p.userId,
      action: p.action === "signed" ? "sign" : p.action === "accepted" ? "approve" : "decline",
      entity: "proposal",
      entityId: p.proposalId,
      details: { action: p.action, clientName: p.clientName },
      organizationId: p.orgId,
    });
  });

  // ─── Margin Alerts ───

  domainEvents.on("margin.threshold.triggered", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "pricing_update",
      `Margin alert: ${(p.currentMargin * 100).toFixed(1)}% (target: ${(p.targetMargin * 100).toFixed(1)}%)`,
      { currentMargin: p.currentMargin, targetMargin: p.targetMargin }
    );
  });

  // ─── Payroll Events ───

  domainEvents.on("staffing.hours.approved", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "hours_approved",
      `Hours approved: ${p.approvedHours.length} staff, $${p.totalLaborCost.toFixed(2)} total labor`,
      { staffCount: p.approvedHours.length, totalLaborCost: p.totalLaborCost }
    );
    logAudit({
      userId: p.userId,
      action: "approve",
      entity: "hours_export",
      entityId: p.eventId,
      details: { staffCount: p.approvedHours.length, totalLaborCost: p.totalLaborCost },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("payroll.exported", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "payroll_exported",
      `Payroll exported: ${p.staffCount} staff, ${p.totalHours}h, $${p.totalLaborCost.toFixed(2)}`,
      { externalPayrollId: p.externalPayrollId, staffCount: p.staffCount, totalHours: p.totalHours }
    );
    logAudit({
      userId: p.userId,
      action: "export",
      entity: "payroll",
      entityId: p.externalPayrollId,
      details: { eventId: p.eventId, staffCount: p.staffCount, totalLaborCost: p.totalLaborCost },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("payroll.paid", async (e) => {
    const p = e.payload;
    await logActivity(
      p.eventId,
      p.userId,
      "payroll_paid",
      `Payroll processed by provider (${p.externalPayrollId})`,
      { externalPayrollId: p.externalPayrollId, paidAt: p.paidAt }
    );
    logAudit({
      userId: p.userId,
      action: "payment_received",
      entity: "payroll",
      entityId: p.externalPayrollId,
      details: { eventId: p.eventId, paidAt: p.paidAt },
      organizationId: p.orgId,
    });
  });

  // ─── CAIN Events ───

  domainEvents.on("cain.plan.committed", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "create",
      entity: "event",
      entityId: p.eventId,
      entityName: p.eventName,
      details: { source: "cain", planId: p.planId, suggestedPrice: p.suggestedPrice },
      organizationId: p.orgId,
    });
  });

  // ─── Distributor Events ───

  domainEvents.on("distributor.catalog.synced", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "import",
      entity: "distributor",
      entityId: p.distributorId,
      entityName: p.distributorName,
      details: { jobId: p.jobId, productsUpserted: p.productsUpserted, priceChanges: p.priceChanges },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("distributor.pricebook.updated", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "update",
      entity: "distributor",
      entityId: p.distributorId,
      entityName: p.distributorName,
      details: { priceChangeCount: p.priceChanges.length },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("distributor.order.submitted", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "export",
      entity: "distributor",
      entityId: p.orderId,
      entityName: p.distributorName,
      details: { orderNumber: p.orderNumber, total: p.total, eventIds: p.eventIds },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("vendor.invoice.received", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "import",
      entity: "distributor",
      entityId: p.distributorId,
      entityName: p.distributorName,
      details: { jobId: p.jobId, invoiceCount: p.invoiceCount, lineItemCount: p.lineItemCount },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("vendor.invoice.reconciled", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "approve",
      entity: "distributor",
      entityId: p.invoiceId,
      details: { orderId: p.orderId, varianceCount: p.varianceCount, totalVarianceAmount: p.totalVarianceAmount },
      organizationId: p.orgId,
    });
  });

  domainEvents.on("vendor.sync.failed", async (e) => {
    const p = e.payload;
    logAudit({
      userId: p.userId,
      action: "import",
      entity: "distributor",
      entityId: p.distributorId,
      entityName: p.distributorName,
      details: { jobId: p.jobId, jobType: p.jobType, error: p.error, attempts: p.attempts },
      organizationId: p.orgId,
    });
  });

  // ─── Global Debug Logger (dev only) ───

  if (process.env.NODE_ENV === "development") {
    domainEvents.onAny((event) => {
      console.log(
        `[domain-event] ${event.name} from ${event.source}`,
        JSON.stringify(event.payload).slice(0, 200)
      );
    });
  }
}
