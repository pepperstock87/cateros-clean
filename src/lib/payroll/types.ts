// Payroll Integration Types (Gusto Embedded)

// ─── Connection & Auth ───

export interface PayrollConnection {
  id: string;
  user_id: string;
  organization_id: string | null;
  provider: "gusto"; // extensible for future providers
  company_uuid: string; // Gusto company UUID
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  company_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ─── Employee Mapping ───

export interface PayrollEmployeeMapping {
  id: string;
  user_id: string;
  organization_id: string | null;
  staff_member_id: string; // Cateros staff_members.id
  payroll_employee_id: string; // Gusto employee UUID
  employee_type: "employee" | "contractor";
  employee_name: string;
  hourly_rate_override: number | null; // if different from Cateros
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Hours Export ───

export type HoursExportStatus = "draft" | "submitted" | "approved" | "rejected" | "processed";

export interface PayrollHoursExport {
  id: string;
  user_id: string;
  organization_id: string | null;
  event_id: string;
  event_name: string;
  event_date: string;
  pay_period_start: string;
  pay_period_end: string;
  status: HoursExportStatus;
  line_items: PayrollHoursLineItem[];
  total_hours: number;
  total_labor_cost: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  exported_to_gusto_at: string | null;
  gusto_payroll_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollHoursLineItem {
  staff_member_id: string;
  staff_name: string;
  role: string;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  total_pay: number;
  event_id: string;
  notes: string | null;
}

// ─── Webhook Events ───

export type PayrollWebhookEventType =
  | "payroll.created"
  | "payroll.processed"
  | "payroll.reverted"
  | "employee.created"
  | "employee.updated"
  | "employee.terminated"
  | "contractor_payment.created"
  | "contractor_payment.processed";

export interface PayrollWebhookEvent {
  event_type: PayrollWebhookEventType;
  resource_type: string;
  resource_uuid: string;
  company_uuid: string;
  timestamp: string;
}

// ─── Labor Report ───

export interface EventLaborReport {
  eventId: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  revenue: number; // suggestedPrice
  laborCost: number;
  laborCostPerGuest: number;
  laborPercent: number; // labor as % of revenue
  staffBreakdown: Array<{
    staffName: string;
    role: string;
    hours: number;
    rate: number;
    cost: number;
  }>;
  margin: number;
  marginWithLabor: number; // margin after labor deduction
}

// ─── Gusto API Types (simplified) ───

export interface GustoEmployee {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  terminated: boolean;
  current_compensation?: {
    rate: string;
    payment_unit: "Hour" | "Year";
    effective_date: string;
  };
}

export interface GustoContractor {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  type: "Individual" | "Business";
  is_active: boolean;
  hourly_rate?: string;
}

export interface GustoPayPeriod {
  start_date: string;
  end_date: string;
  pay_schedule_uuid: string;
}

export interface GustoPayrollItem {
  employee_uuid: string;
  hours: Array<{
    name: string; // "Regular Hours", "Overtime"
    hours: string;
  }>;
}
