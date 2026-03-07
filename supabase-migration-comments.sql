CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('caterer', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
-- Allow public read/write for comments (controlled by share_token validation in API)
ALTER TABLE proposal_comments FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow all proposal comments" ON proposal_comments FOR ALL USING (true);
CREATE INDEX idx_proposal_comments ON proposal_comments(proposal_id, created_at);
