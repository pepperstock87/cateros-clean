-- Migration: QuickBooks Online Integration Tables
-- Stores OAuth connections, ID mappings, sync logs, and retry queue

-- ─── QBO Connections ───
-- One active connection per user per QBO company (realm)

CREATE TABLE IF NOT EXISTS qb_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  realm_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  company_name text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, realm_id)
);

CREATE INDEX idx_qb_connections_user_active ON qb_connections(user_id, is_active);

ALTER TABLE qb_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own QBO connections"
  ON qb_connections FOR ALL
  USING (auth.uid() = user_id);

-- ─── ID Mappings ───
-- Bidirectional mapping between Cateros and QBO entity IDs

CREATE TABLE IF NOT EXISTS qb_id_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  entity_type text NOT NULL, -- 'customer', 'invoice', 'payment', 'item', 'vendor', 'account'
  cateros_id text NOT NULL,
  qb_id text NOT NULL,
  realm_id text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_hash text, -- SHA-256 hash of last synced data for change detection
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, cateros_id, realm_id)
);

CREATE INDEX idx_qb_mappings_lookup ON qb_id_mappings(user_id, entity_type, qb_id, realm_id);

ALTER TABLE qb_id_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own QBO mappings"
  ON qb_id_mappings FOR ALL
  USING (auth.uid() = user_id);

-- ─── Sync Logs ───
-- History of all sync operations for auditing and debugging

CREATE TABLE IF NOT EXISTS qb_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  realm_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  direction text NOT NULL, -- 'cateros_to_qb', 'qb_to_cateros', 'bidirectional'
  status text NOT NULL, -- 'pending', 'in_progress', 'success', 'failed', 'skipped'
  error_message text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_sync_logs_user ON qb_sync_logs(user_id, created_at DESC);
CREATE INDEX idx_qb_sync_logs_entity ON qb_sync_logs(entity_type, entity_id);

ALTER TABLE qb_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON qb_sync_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert (for webhook processing)
CREATE POLICY "Service can insert sync logs"
  ON qb_sync_logs FOR INSERT
  WITH CHECK (true);

-- ─── Retry Queue ───
-- Failed sync operations queued for retry with exponential backoff

CREATE TABLE IF NOT EXISTS qb_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  realm_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  direction text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  last_error text,
  status text NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_sync_queue_pending ON qb_sync_queue(status, next_retry_at)
  WHERE status = 'queued';

ALTER TABLE qb_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync queue"
  ON qb_sync_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage sync queue"
  ON qb_sync_queue FOR ALL
  WITH CHECK (true);
