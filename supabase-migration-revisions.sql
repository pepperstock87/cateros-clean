-- Add revision tracking to proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES proposals(id);

CREATE INDEX IF NOT EXISTS idx_proposals_parent ON proposals(parent_proposal_id);
