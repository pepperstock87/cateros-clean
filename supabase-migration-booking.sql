-- Phase 4: Booking Workflow Migration
-- Extends proposals and events tables for booking workflow support

-- =============================================================================
-- 1. Extend events table with booking configuration
-- =============================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS booking_config JSONB DEFAULT '{"require_approval": true, "require_contract": false, "require_deposit": true}'::jsonb;

-- =============================================================================
-- 2. Extend proposals table with contract and viewing fields
-- =============================================================================

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contract_accepted_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contract_accepted_ip TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contract_accepted_name TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- =============================================================================
-- 3. Create contract_acceptances table for audit trail
-- =============================================================================

CREATE TABLE contract_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  accepted_by_name TEXT NOT NULL,
  accepted_by_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  terms_snapshot TEXT, -- snapshot of terms at time of acceptance
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE contract_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract acceptances for their events"
  ON contract_acceptances FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = contract_acceptances.event_id AND e.user_id = auth.uid())
  );

-- Public insert policy (clients accept without auth, validated via share_token in API)
CREATE POLICY "Allow insert via service role"
  ON contract_acceptances FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 4. Index for proposal expiration queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_proposals_expires_at ON proposals(expires_at) WHERE expires_at IS NOT NULL;
