// Distributor Integration Layer — public API

// Register all connectors on import
import "./connectors/index";

export { getConnector, listConnectors } from "./registry";
export { createSyncJob, processSyncJob, processRetryQueue, getRecentSyncJobs } from "./sync";
export { reconcileInvoice, recordDelivery, getSpendingSummary } from "./reconciliation";
export {
  getProductMappings,
  getPreferredProduct,
  getProductOptions,
  upsertProductMapping,
  removeProductMapping,
  suggestMappings,
} from "./mapping";
export type { VarianceItem, ReconciliationResult } from "./reconciliation";
export type {
  Distributor,
  DistributorProduct,
  DistributorProductMapping,
  DistributorOrder,
  DistributorOrderLine,
  DistributorInvoice,
  DistributorInvoiceLine,
  DistributorCredit,
  DistributorSyncJob,
  ConnectorType,
  DistributorTransport,
  SyncJobType,
  CatalogImportResult,
  InvoiceImportResult,
} from "./types";
