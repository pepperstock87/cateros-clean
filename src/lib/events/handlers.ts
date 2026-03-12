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
