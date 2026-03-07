CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_name)
);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own client notes" ON client_notes FOR ALL USING (auth.uid() = user_id);
