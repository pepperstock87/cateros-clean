-- Recipe source tracking
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- 'manual' | 'ai_draft' | 'imported'

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
-- 'approved' | 'draft' | 'archived'

-- Index for filtering drafts
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status) WHERE status = 'draft';
