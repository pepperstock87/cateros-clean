-- Create rental_items table
CREATE TABLE IF NOT EXISTS rental_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rental items"
  ON rental_items FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_items_user ON rental_items(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_org ON rental_items(organization_id);
