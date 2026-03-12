-- Migration: Payroll Integration Tables (Gusto Embedded)
-- Stores OAuth connections, employee mappings, hours exports, and webhook state

-- ─── Payroll Connections ───

CREATE TABLE IF NOT EXISTS payroll_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'gusto', -- extensible for future providers
  company_uuid text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  company_name text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_payroll_connections_user ON payroll_connections(user_id, is_active);

ALTER TABLE payroll_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payroll connections"
  ON payroll_connections FOR ALL
  USING (auth.uid() = user_id);

-- ─── Employee/Contractor Mappings ───
-- Maps Cateros staff_members to Gusto employees/contractors

CREATE TABLE IF NOT EXISTS payroll_employee_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  payroll_employee_id text NOT NULL, -- Gusto employee/contractor UUID
  employee_type text NOT NULL DEFAULT 'employee', -- 'employee' or 'contractor'
  employee_name text NOT NULL,
  hourly_rate_override numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, staff_member_id)
);

CREATE INDEX idx_payroll_mappings_user ON payroll_employee_mappings(user_id, is_active);

ALTER TABLE payroll_employee_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own employee mappings"
  ON payroll_employee_mappings FOR ALL
  USING (auth.uid() = user_id);

-- ─── Hours Exports ───
-- Tracks hours collected from events and exported to payroll

CREATE TABLE IF NOT EXISTS payroll_hours_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_date date NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected, processed
  line_items jsonb NOT NULL DEFAULT '[]',
  total_hours numeric(10,2) NOT NULL DEFAULT 0,
  total_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  exported_to_gusto_at timestamptz,
  gusto_payroll_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_exports_event ON payroll_hours_exports(event_id);
CREATE INDEX idx_payroll_exports_user_status ON payroll_hours_exports(user_id, status);
CREATE INDEX idx_payroll_exports_payroll ON payroll_hours_exports(gusto_payroll_id)
  WHERE gusto_payroll_id IS NOT NULL;

ALTER TABLE payroll_hours_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hours exports"
  ON payroll_hours_exports FOR ALL
  USING (auth.uid() = user_id);
