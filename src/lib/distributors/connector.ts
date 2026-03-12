// Distributor Connector Interface
//
// Abstract contract that every distributor adapter implements.
// Transport details (API, SFTP, EDI, file) are encapsulated inside each connector.
// Optional methods allow connectors to grow incrementally (catalog-only → full PO lifecycle).

import type {
  ConnectorType,
  DistributorTransport,
  ConnectorInput,
  CatalogImportResult,
  OrderSubmitResult,
  InvoiceImportResult,
  DeliveryStatusResult,
  DistributorOrder,
} from "./types";

export interface ConnectorContext {
  organizationId: string | null;
  userId: string;
  distributorId: string;
  config: Record<string, unknown>;
}

export interface DistributorConnector {
  readonly connectorType: ConnectorType;
  readonly supportedTransports: DistributorTransport[];
  readonly displayName: string;

  /**
   * Import or refresh the distributor's product catalog.
   * For file-based connectors, input contains the file buffer.
   * For API/SFTP connectors, input specifies the transport to use.
   */
  importCatalog(ctx: ConnectorContext, input: ConnectorInput): Promise<CatalogImportResult>;

  /**
   * Submit a purchase order to the distributor.
   * May generate an EDI 850, CSV, or API call depending on transport.
   */
  submitOrder?(ctx: ConnectorContext, order: DistributorOrder, lines: Array<{
    sku: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>): Promise<OrderSubmitResult>;

  /**
   * Import invoices from the distributor.
   * Parses EDI 810, CSV, or API response depending on transport.
   */
  importInvoices?(ctx: ConnectorContext, input: ConnectorInput): Promise<InvoiceImportResult>;

  /**
   * Check delivery status for an order.
   */
  checkDeliveryStatus?(ctx: ConnectorContext, orderNumber: string): Promise<DeliveryStatusResult>;

  /**
   * Validate the connector configuration (test SFTP connection, API key, etc.)
   */
  validateConfig?(ctx: ConnectorContext): Promise<{ valid: boolean; error?: string }>;
}
