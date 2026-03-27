/**
 * CAIN Action System
 * Defines types for the approval queue system
 */

// All possible action types that CAIN can propose
export type CainActionType =
  | "assign_staff"
  | "send_proposal"
  | "update_event_status"
  | "create_purchase_order"
  | "send_invoice"
  | "send_payment_reminder"
  | "send_message"
  | "create_client"
  | "update_inventory"
  | "create_event"
  | "update_pricing"
  | "sync_quickbooks"
  | "export_payroll"
  | "confirm_event"
  | "cancel_event";

// Status of a pending action
export type CainActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed" | "expired";

// Priority level for display/ordering
export type CainActionPriority = "low" | "normal" | "high" | "urgent";

// Discriminated union of action-specific payloads
export type CainActionPayload =
  | { type: "assign_staff"; eventId: string; staffMemberId: string; role: string; startTime?: string; endTime?: string }
  | { type: "send_proposal"; proposalId: string; clientEmail: string; includeAttachment?: boolean }
  | { type: "update_event_status"; eventId: string; status: string }
  | { type: "create_purchase_order"; distributorId: string; items: Array<{ sku: string; quantity: number; unitPrice: number }> }
  | { type: "send_invoice"; invoiceId: string; clientEmail: string; dueDate?: string }
  | { type: "send_payment_reminder"; invoiceId: string; clientEmail: string }
  | { type: "send_message"; recipientId: string; recipientEmail?: string; message: string; messageType?: "email" | "sms" | "in_app" }
  | { type: "create_client"; name: string; email?: string; phone?: string; notes?: string }
  | { type: "update_inventory"; inventoryItemId: string; quantity: number; operation: "add" | "remove" | "set" }
  | { type: "create_event"; name: string; clientName: string; clientEmail?: string; eventDate: string; guestCount: number; venue?: string; notes?: string }
  | { type: "update_pricing"; eventId: string; pricingData: Record<string, unknown> }
  | { type: "sync_quickbooks"; accounts: string[] }
  | { type: "export_payroll"; payrollPeriod: string; employeeIds: string[] }
  | { type: "confirm_event"; eventId: string }
  | { type: "cancel_event"; eventId: string; reason?: string };

// Result of executing an action
export interface CainActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Database row representation
export interface CainPendingAction {
  id: string;
  user_id: string;
  organization_id: string | null;
  session_id: string | null;
  action_type: CainActionType;
  title: string;
  description: string | null;
  payload: CainActionPayload;
  preview_data: Record<string, unknown> | null;
  status: CainActionStatus;
  priority: CainActionPriority;
  requires_input: boolean;
  input_prompt: string | null;
  user_input: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  executed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Request to propose a new action
export interface CainProposeActionRequest {
  action_type: CainActionType;
  title: string;
  description?: string;
  payload: CainActionPayload;
  preview_data?: Record<string, unknown>;
  priority?: CainActionPriority;
  session_id?: string;
  organization_id?: string;
  requires_input?: boolean;
  input_prompt?: string;
}

// Response from approving/rejecting an action
export interface CainActionUpdateResponse {
  success: boolean;
  action?: CainPendingAction;
  error?: string;
}

// Stats for display in dashboard badge
export interface CainActionStats {
  pendingCount: number;
  failedCount: number;
  executedCount: number;
  oldestPendingId?: string;
  oldestPendingCreatedAt?: string;
}
