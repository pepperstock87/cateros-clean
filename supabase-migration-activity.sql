CREATE TABLE IF NOT EXISTS event_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own event activity"
  ON event_activity
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_event_activity_event
  ON event_activity(event_id, created_at DESC);
