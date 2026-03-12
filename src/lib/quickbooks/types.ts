// QuickBooks Online Integration Types

// ─── Connection & Auth ───

export interface QBConnection {
  id: string;
  user_id: string;
  organization_id: string | null;
  realm_id: string; // QBO company ID
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  company_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QBTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  x_refresh_token_expires_in: number;
}

// ─── ID Mapping ───

export type QBEntityType =
  | "customer"
  | "invoice"
  | "payment"
  | "item"
  | "vendor"
  | "account";

export interface QBIdMapping {
  id: string;
  user_id: string;
  organization_id: string | null;
  entity_type: QBEntityType;
  cateros_id: string;
  qb_id: string;
  realm_id: string;
  last_synced_at: string;
  sync_hash: string | null; // hash of last synced data for conflict detection
  created_at: string;
}

// ─── Sync ───

export type QBSyncDirection = "cateros_to_qb" | "qb_to_cateros" | "bidirectional";
export type QBSyncStatus = "pending" | "in_progress" | "success" | "failed" | "skipped";

export interface QBSyncLog {
  id: string;
  user_id: string;
  organization_id: string | null;
  realm_id: string;
  entity_type: QBEntityType;
  entity_id: string;
  direction: QBSyncDirection;
  status: QBSyncStatus;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface QBSyncQueueItem {
  id: string;
  user_id: string;
  organization_id: string | null;
  realm_id: string;
  entity_type: QBEntityType;
  entity_id: string;
  direction: QBSyncDirection;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

// ─── QBO API Entities (simplified) ───

export interface QBCustomer {
  Id?: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Notes?: string;
  Active?: boolean;
}

export interface QBInvoiceLine {
  Amount: number;
  Description?: string;
  DetailType: "SalesItemLineDetail";
  SalesItemLineDetail: {
    ItemRef?: { value: string; name?: string };
    UnitPrice?: number;
    Qty?: number;
  };
}

export interface QBInvoice {
  Id?: string;
  CustomerRef: { value: string; name?: string };
  Line: QBInvoiceLine[];
  DueDate?: string;
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  TotalAmt?: number;
  Balance?: number;
}

export interface QBPayment {
  Id?: string;
  CustomerRef: { value: string; name?: string };
  TotalAmt: number;
  TxnDate?: string;
  PaymentMethodRef?: { value: string; name?: string };
  PrivateNote?: string;
  Line?: Array<{
    Amount: number;
    LinkedTxn: Array<{ TxnId: string; TxnType: string }>;
  }>;
}
