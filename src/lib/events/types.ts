// Internal Domain Event Type Definitions
// These are application-level domain events, not browser events.
// They decouple producers from consumers and enable future integrations
// (QuickBooks, payroll, CAIN reasoning) without modifying core business logic.

// ─── Event Payloads ───

export interface EventCreatedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  eventName: string;
  clientName: string;
  clientId: string | null;
  eventDate: string;
  guestCount: number;
  source: "manual" | "cain" | "template" | "clone";
}

export interface EventUpdatedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
}

export interface EventStatusChangedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  fromStatus: string;
  toStatus: string;
}

export interface StaffingPlanUpdatedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  assignments: Array<{
    staffMemberId: string;
    role: string;
    action: "added" | "removed" | "updated";
  }>;
}

export interface StaffingHoursApprovedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  approvedHours: Array<{
    staffMemberId: string;
    staffName: string;
    hours: number;
    hourlyRate: number;
  }>;
  totalLaborCost: number;
}

export interface InvoiceCreatedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  invoiceAmount: number;
  clientName: string;
  clientEmail: string | null;
  dueDate: string | null;
}

export interface InvoiceSentPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  proposalId: string;
  clientEmail: string;
  amount: number;
}

export interface PaymentReceivedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  paymentId: string;
  amount: number;
  method: string;
  isDeposit: boolean;
  totalPaid: number;
  totalDue: number;
}

export interface ProposalSentPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  proposalId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
}

export interface ProposalRespondedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  proposalId: string;
  action: "accepted" | "declined" | "revision_requested" | "signed";
  clientName: string;
}

export interface MenuUpdatedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  menuItemCount: number;
  totalFoodCost: number;
}

export interface MarginThresholdTriggeredPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  currentMargin: number;
  targetMargin: number;
  suggestedPrice: number;
  totalCost: number;
}

export interface CainPlanGeneratedPayload {
  eventId: string | null; // null before commit
  userId: string;
  orgId: string | null;
  planId: string;
  brief: string;
  guestCount: number;
  suggestedPrice: number;
  toolCallCount: number;
  iterationCount: number;
}

export interface CainPlanCommittedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  planId: string;
  eventName: string;
  suggestedPrice: number;
}

// Future integration placeholders
export interface PayrollExportedPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  externalPayrollId: string;
  staffCount: number;
  totalHours: number;
  totalLaborCost: number;
}

export interface PayrollPaidPayload {
  eventId: string;
  userId: string;
  orgId: string | null;
  externalPayrollId: string;
  paidAt: string;
}

// ─── Domain Event Map ───

export interface DomainEventMap {
  "event.created": EventCreatedPayload;
  "event.updated": EventUpdatedPayload;
  "event.status_changed": EventStatusChangedPayload;
  "staffing.plan.updated": StaffingPlanUpdatedPayload;
  "staffing.hours.approved": StaffingHoursApprovedPayload;
  "invoice.created": InvoiceCreatedPayload;
  "invoice.sent": InvoiceSentPayload;
  "payment.received": PaymentReceivedPayload;
  "proposal.sent": ProposalSentPayload;
  "proposal.responded": ProposalRespondedPayload;
  "menu.updated": MenuUpdatedPayload;
  "margin.threshold.triggered": MarginThresholdTriggeredPayload;
  "cain.plan.generated": CainPlanGeneratedPayload;
  "cain.plan.committed": CainPlanCommittedPayload;
  "payroll.exported": PayrollExportedPayload;
  "payroll.paid": PayrollPaidPayload;
}

export type DomainEventName = keyof DomainEventMap;

export interface DomainEvent<T extends DomainEventName = DomainEventName> {
  id: string;
  name: T;
  payload: DomainEventMap[T];
  timestamp: string;
  source: string; // module that emitted (e.g. "actions/events", "cain/engine")
}
