// Gusto API Client
//
// Wraps the Gusto REST API with auto-refresh and typed methods.

import { getValidToken } from "./auth";
import type {
  GustoEmployee,
  GustoContractor,
  GustoPayPeriod,
} from "./types";

function getBaseUrl(): string {
  return process.env.GUSTO_ENV === "production"
    ? "https://api.gusto.com"
    : "https://api.gusto-demo.com";
}

export class GustoApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "GustoApiError";
  }
}

async function gustoFetch(
  method: string,
  path: string,
  accessToken: string,
  body?: unknown
): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;

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
    throw new GustoApiError(
      errorBody?.message || `Gusto API error (${res.status})`,
      res.status,
      errorBody
    );
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export class GustoClient {
  constructor(
    private accessToken: string,
    private companyUuid: string
  ) {}

  static async fromUser(
    userId: string,
    orgId: string | null
  ): Promise<GustoClient | null> {
    const auth = await getValidToken(userId, orgId);
    if (!auth) return null;
    return new GustoClient(auth.accessToken, auth.companyUuid);
  }

  // ─── Company ───

  async getCompany(): Promise<{ uuid: string; name: string; trade_name: string }> {
    const data = await gustoFetch(
      "GET",
      `/v1/companies/${this.companyUuid}`,
      this.accessToken
    );
    return data as any;
  }

  // ─── Employees ───

  async listEmployees(): Promise<GustoEmployee[]> {
    const data = await gustoFetch(
      "GET",
      `/v1/companies/${this.companyUuid}/employees`,
      this.accessToken
    );
    return (data as any[]) ?? [];
  }

  async getEmployee(uuid: string): Promise<GustoEmployee> {
    const data = await gustoFetch(
      "GET",
      `/v1/employees/${uuid}`,
      this.accessToken
    );
    return data as GustoEmployee;
  }

  // ─── Contractors ───

  async listContractors(): Promise<GustoContractor[]> {
    const data = await gustoFetch(
      "GET",
      `/v1/companies/${this.companyUuid}/contractors`,
      this.accessToken
    );
    return (data as any[]) ?? [];
  }

  // ─── Pay Periods ───

  async getPayPeriods(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<GustoPayPeriod[]> {
    let path = `/v1/companies/${this.companyUuid}/pay_periods`;
    if (params) {
      const qs = new URLSearchParams();
      if (params.start_date) qs.set("start_date", params.start_date);
      if (params.end_date) qs.set("end_date", params.end_date);
      if (qs.toString()) path += `?${qs.toString()}`;
    }
    const data = await gustoFetch("GET", path, this.accessToken);
    return (data as any[]) ?? [];
  }

  // ─── Payrolls ───

  async getUnprocessedPayroll(payPeriodStart: string, payPeriodEnd: string): Promise<any> {
    const data = await gustoFetch(
      "GET",
      `/v1/companies/${this.companyUuid}/payrolls?processing_period_start_date=${payPeriodStart}&processing_period_end_date=${payPeriodEnd}&processed=false`,
      this.accessToken
    );
    const payrolls = data as any[];
    return payrolls?.[0] ?? null;
  }

  async updatePayrollEmployeeHours(
    payrollId: string,
    employeeUuid: string,
    hours: Array<{ name: string; hours: string }>
  ): Promise<void> {
    await gustoFetch(
      "PUT",
      `/v1/companies/${this.companyUuid}/payrolls/${payrollId}`,
      this.accessToken,
      {
        version: "latest",
        employee_compensations: [
          {
            employee_uuid: employeeUuid,
            fixed_compensations: [],
            hourly_compensations: hours,
          },
        ],
      }
    );
  }

  // ─── Contractor Payments ───

  async createContractorPayment(params: {
    contractorUuid: string;
    date: string;
    hourlyRate: number;
    hours: number;
  }): Promise<any> {
    const data = await gustoFetch(
      "POST",
      `/v1/companies/${this.companyUuid}/contractor_payments`,
      this.accessToken,
      {
        contractor_uuid: params.contractorUuid,
        date: params.date,
        hourly_rate: params.hourlyRate.toString(),
        hours: params.hours.toString(),
      }
    );
    return data;
  }
}
