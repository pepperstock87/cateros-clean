// Distributor Integration Layer — Normalized Data Model
//
// Transport-agnostic types for distributor connectivity.
// Supports API, webhook, EDI, SFTP, file upload, and manual CSV.
// One Cateros ingredient can map to many distributor SKUs and vice versa.

// ─── Enums ───

export type DistributorTransport =
  | "api"
  | "webhook"
  | "edi"
  | "sftp"
  | "file_upload"
  | "manual_csv";

export type ConnectorType =
  | "pfg"
  | "sysco"
  | "usfoods"
  | "baldor"
  | "custom";

export type SyncJobType =
  | "catalog_import"
  | "order_export"
  | "invoice_import"
  | "delivery_update"
  | "price_update";

export type SyncJobStatus = "queued" | "processing" | "completed" | "failed";

export type OrderStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "canceled";

export type InvoiceStatus = "pending" | "approved" | "paid" | "disputed";

export type CreditStatus = "pending" | "applied" | "expired";

// ─── Database Row Types ───

export interface Distributor {
  id: string;
  organization_id: string | null;
  user_id: string;
  name: string;
  connector_type: ConnectorType;
  transport: DistributorTransport;
  config: Record<string, unknown>; // SFTP creds, API keys, EDI partner IDs, column mappings
  is_active: boolean;
  account_number: string | null;
  rep_name: string | null;
  rep_email: string | null;
  rep_phone: string | null;
  default_delivery_address: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorProduct {
  id: string;
  distributor_id: string;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  pack_size: string | null; // e.g., "6/10#", "4/1gal"
  unit: string | null; // each, case, lb
  unit_price: number | null;
  price_effective_date: string | null;
  category: string | null;
  is_active: boolean;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorProductMapping {
  id: string;
  organization_id: string | null;
  distributor_product_id: string;
  inventory_item_id: string | null; // FK to inventory, nullable until mapped
  ingredient_name: string; // denormalized for display
  conversion_factor: number; // e.g., 1 case = 6 units
  conversion_unit: string | null; // unit after conversion
  is_preferred: boolean; // preferred vendor for this ingredient
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorOrder {
  id: string;
  organization_id: string | null;
  user_id: string;
  distributor_id: string;
  order_number: string | null; // PO number or distributor ref
  status: OrderStatus;
  order_date: string;
  requested_delivery_date: string | null;
  actual_delivery_date: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  event_ids: string[]; // which events this order serves
  external_order_id: string | null; // distributor's order ID
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorOrderLine {
  id: string;
  order_id: string;
  distributor_product_id: string | null;
  sku: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number | null;
  unit: string | null;
  unit_price: number;
  extended_price: number;
  substitution_sku: string | null;
  substitution_name: string | null;
  notes: string | null;
}

export interface DistributorInvoice {
  id: string;
  organization_id: string | null;
  user_id: string;
  distributor_id: string;
  order_id: string | null; // FK to distributor_orders
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  pdf_url: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DistributorInvoiceLine {
  id: string;
  invoice_id: string;
  distributor_product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  extended_price: number;
  order_line_id: string | null; // FK for reconciliation
  variance_flag: boolean; // true if price/qty differs from order
  notes: string | null;
}

export interface DistributorCredit {
  id: string;
  organization_id: string | null;
  distributor_id: string;
  invoice_id: string | null;
  credit_number: string | null;
  amount: number;
  reason: string | null;
  status: CreditStatus;
  created_at: string;
  updated_at: string;
}

export interface DistributorSyncJob {
  id: string;
  organization_id: string | null;
  user_id: string;
  distributor_id: string;
  job_type: SyncJobType;
  transport: DistributorTransport;
  status: SyncJobStatus;
  idempotency_key: string;
  input_file_url: string | null;
  input_data: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Connector Result Types ───

export interface CatalogImportResult {
  productsUpserted: number;
  productsDeactivated: number;
  priceChanges: Array<{ sku: string; name: string; oldPrice: number; newPrice: number }>;
  errors: Array<{ sku: string; error: string }>;
}

export interface OrderSubmitResult {
  externalOrderNumber: string | null;
  confirmationData: Record<string, unknown>;
  errors: string[];
}

export interface InvoiceImportResult {
  invoicesCreated: number;
  invoicesUpdated: number;
  creditsCreated: number;
  lineItems: number;
  errors: Array<{ ref: string; error: string }>;
}

export interface DeliveryStatusResult {
  status: string;
  estimatedDelivery: string | null;
  trackingInfo: string | null;
  substitutions: Array<{ originalSku: string; substituteSku: string; reason: string }>;
}

// ─── Connector Input Types (transport-aware) ───

export type FileInput = {
  transport: "file_upload" | "manual_csv";
  fileBuffer: Buffer;
  filename: string;
  mimeType?: string;
};

export type SftpInput = {
  transport: "sftp";
  remotePath?: string;
};

export type ApiInput = {
  transport: "api";
};

export type EdiInput = {
  transport: "edi";
  rawData: string;
  ediType?: string; // "810" | "850" | "856"
};

export type ConnectorInput = FileInput | SftpInput | ApiInput | EdiInput;

// ─── Config Types ───

export interface PFGConfig {
  catalog_columns?: Record<string, string>; // column mapping overrides
  invoice_columns?: Record<string, string>;
  sftp?: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
    catalog_path?: string;
    invoice_path?: string;
    order_path?: string;
  };
}

export interface SyscoConfig {
  api_key?: string;
  customer_id?: string;
  sftp?: {
    host: string;
    username: string;
    password?: string;
  };
}
