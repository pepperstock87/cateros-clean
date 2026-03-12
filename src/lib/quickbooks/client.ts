// QuickBooks Online API Client
//
// Wraps the QBO REST API with automatic token refresh, error handling,
// and rate limit awareness. All QBO API calls go through this client.

import { getValidToken } from "./auth";
import type {
  QBCustomer,
  QBInvoice,
  QBPayment,
} from "./types";

const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QBO_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

function getBaseUrl(): string {
  return process.env.QBO_SANDBOX === "true" ? QBO_SANDBOX_BASE : QBO_API_BASE;
}

export class QBApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public qbErrors?: Array<{ Message: string; Detail?: string; code?: string }>
  ) {
    super(message);
    this.name = "QBApiError";
  }
}

// ─── Core HTTP Methods ───

async function qbFetch(
  method: string,
  realmId: string,
  path: string,
  accessToken: string,
  body?: unknown
): Promise<unknown> {
  const url = `${getBaseUrl()}/${realmId}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const qbErrors = errorBody?.Fault?.Error;
    const message = qbErrors?.[0]?.Message || `QBO API error (${res.status})`;
    throw new QBApiError(message, res.status, qbErrors);
  }

  return res.json();
}

// ─── QuickBooks API Client ───

export class QuickBooksClient {
  constructor(
    private accessToken: string,
    private realmId: string
  ) {}

  /**
   * Create a client from stored credentials. Returns null if no active connection.
   */
  static async fromUser(
    userId: string,
    orgId: string | null
  ): Promise<QuickBooksClient | null> {
    const auth = await getValidToken(userId, orgId);
    if (!auth) return null;
    return new QuickBooksClient(auth.accessToken, auth.realmId);
  }

  // ─── Company Info ───

  async getCompanyInfo(): Promise<{ CompanyName: string; Country: string }> {
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/companyinfo/${this.realmId}`,
      this.accessToken
    )) as any;
    return data.CompanyInfo;
  }

  // ─── Customers ───

  async createCustomer(customer: QBCustomer): Promise<QBCustomer> {
    const data = (await qbFetch(
      "POST",
      this.realmId,
      "/customer",
      this.accessToken,
      customer
    )) as any;
    return data.Customer;
  }

  async updateCustomer(customer: QBCustomer & { Id: string; SyncToken: string }): Promise<QBCustomer> {
    const data = (await qbFetch(
      "POST",
      this.realmId,
      "/customer",
      this.accessToken,
      customer
    )) as any;
    return data.Customer;
  }

  async getCustomer(id: string): Promise<QBCustomer & { Id: string; SyncToken: string }> {
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/customer/${id}`,
      this.accessToken
    )) as any;
    return data.Customer;
  }

  async queryCustomers(where?: string): Promise<QBCustomer[]> {
    const query = where
      ? `SELECT * FROM Customer WHERE ${where}`
      : "SELECT * FROM Customer MAXRESULTS 1000";
    const encoded = encodeURIComponent(query);
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/query?query=${encoded}`,
      this.accessToken
    )) as any;
    return data.QueryResponse?.Customer ?? [];
  }

  // ─── Invoices ───

  async createInvoice(invoice: QBInvoice): Promise<QBInvoice> {
    const data = (await qbFetch(
      "POST",
      this.realmId,
      "/invoice",
      this.accessToken,
      invoice
    )) as any;
    return data.Invoice;
  }

  async getInvoice(id: string): Promise<QBInvoice & { Id: string; SyncToken: string }> {
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/invoice/${id}`,
      this.accessToken
    )) as any;
    return data.Invoice;
  }

  async voidInvoice(id: string, syncToken: string): Promise<void> {
    await qbFetch(
      "POST",
      this.realmId,
      `/invoice?operation=void`,
      this.accessToken,
      { Id: id, SyncToken: syncToken }
    );
  }

  // ─── Payments ───

  async createPayment(payment: QBPayment): Promise<QBPayment> {
    const data = (await qbFetch(
      "POST",
      this.realmId,
      "/payment",
      this.accessToken,
      payment
    )) as any;
    return data.Payment;
  }

  async getPayment(id: string): Promise<QBPayment & { Id: string; SyncToken: string }> {
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/payment/${id}`,
      this.accessToken
    )) as any;
    return data.Payment;
  }

  // ─── Generic Query ───

  async query(sql: string): Promise<any> {
    const encoded = encodeURIComponent(sql);
    const data = (await qbFetch(
      "GET",
      this.realmId,
      `/query?query=${encoded}`,
      this.accessToken
    )) as any;
    return data.QueryResponse;
  }
}
