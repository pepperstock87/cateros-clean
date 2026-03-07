-- Phase 3: Transaction Layer Migration
-- Creates payment_schedules and payments tables for CaterOS

-- ============================================================
-- 1. payment_schedules table
-- ============================================================
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  installment_name TEXT NOT NULL, -- e.g. "Deposit", "Second Payment", "Final Balance"
  amount NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(5,2), -- optional: percentage of total (e.g. 50.00)
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','due','paid','failed','waived','refunded')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment_schedules
CREATE INDEX idx_payment_schedules_event_id ON payment_schedules(event_id);
CREATE INDEX idx_payment_schedules_organization_id ON payment_schedules(organization_id);

-- ============================================================
-- 2. payments table
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method_type TEXT, -- 'card', 'bank_transfer', 'cash', 'check', etc.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','refunded','partially_refunded')),
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payments
CREATE INDEX idx_payments_event_id ON payments(event_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_checkout_session_id ON payments(stripe_checkout_session_id);

-- ============================================================
-- 3. Row Level Security
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_schedules
CREATE POLICY "Users can manage payment schedules for their events"
  ON payment_schedules FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = payment_schedules.event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage payment schedules for their organization"
  ON payment_schedules FOR ALL USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payment_schedules.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- RLS policies for payments
CREATE POLICY "Users can manage payments for their events"
  ON payments FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = payments.event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage payments for their organization"
  ON payments FOR ALL USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payments.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );
