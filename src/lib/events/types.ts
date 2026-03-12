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

// Distributor integration events
export interface DistributorCatalogSyncedPayload {
  distributorId: string;
  distributorName: string;
  orgId: string | null;
  userId: string;
  jobId: string;
  productsUpserted: number;
  priceChanges: number;
}

export interface DistributorPricebookUpdatedPayload {
  distributorId: string;
  distributorName: string;
  orgId: string | null;
  userId: string;
  priceChanges: Array<{ sku: string; name: string; oldPrice: number; newPrice: number }>;
}

export interface DistributorOrderSubmittedPayload {
  distributorId: string;
  distributorName: string;
  orgId: string | null;
  userId: string;
  orderId: string;
  orderNumber: string | null;
  total: number;
  eventIds: string[];
}

export interface DistributorOrderStatusChangedPayload {
  distributorId: string;
  orgId: string | null;
  userId: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
}

export interface VendorInvoiceReceivedPayload {
  distributorId: string;
  distributorName: string;
  orgId: string | null;
  userId: string;
  jobId: string;
  invoiceCount: number;
  lineItemCount: number;
}

export interface VendorInvoiceReconciledPayload {
  distributorId: string;
  orgId: string | null;
  userId: string;
  invoiceId: string;
  orderId: string;
  varianceCount: number;
  totalVarianceAmount: number;
}

export interface VendorCreditReceivedPayload {
  distributorId: string;
  orgId: string | null;
  userId: string;
  creditId: string;
  amount: number;
  reason: string | null;
}

export interface VendorSyncFailedPayload {
  distributorId: string;
  distributorName: string;
  orgId: string | null;
  userId: string;
  jobId: string;
  jobType: string;
  error: string;
  attempts: number;
}

export interface VendorMappingUpdatedPayload {
  distributorId: string;
  orgId: string | null;
  userId: string;
  mappingsChanged: number;
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
  "distributor.catalog.synced": DistributorCatalogSyncedPayload;
  "distributor.pricebook.updated": DistributorPricebookUpdatedPayload;
  "distributor.order.submitted": DistributorOrderSubmittedPayload;
  "distributor.order.status_changed": DistributorOrderStatusChangedPayload;
  "vendor.invoice.received": VendorInvoiceReceivedPayload;
  "vendor.invoice.reconciled": VendorInvoiceReconciledPayload;
  "vendor.credit.received": VendorCreditReceivedPayload;
  "vendor.sync.failed": VendorSyncFailedPayload;
  "vendor.mapping.updated": VendorMappingUpdatedPayload;
}

export type DomainEventName = keyof DomainEventMap;

export interface DomainEvent<T extends DomainEventName = DomainEventName> {
  id: string;
  name: T;
  payload: DomainEventMap[T];
  timestamp: string;
  source: string; // module that emitted (e.g. "actions/events", "cain/engine")
}
