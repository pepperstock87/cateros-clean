CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_name text,
  details jsonb,
  organization_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit log" ON audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit log" ON audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
