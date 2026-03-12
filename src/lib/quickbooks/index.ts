// QuickBooks Integration — public API
export {
  getAuthorizationUrl,
  getConnection,
  disconnect,
  getValidToken,
} from "./auth";
export { QuickBooksClient } from "./client";
export {
  syncClientToQB,
  syncEventInvoiceToQB,
  syncPaymentToQB,
} from "./sync";
export { getRecentSyncLogs } from "./queue";
export { registerQBEventHandlers } from "./event-handlers";
export type {
  QBConnection,
  QBEntityType,
  QBSyncLog,
  QBSyncStatus,
} from "./types";
