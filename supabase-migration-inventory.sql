CREATE TABLE IF NOT EXISTS inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredient_name text NOT NULL,
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  par_level numeric,
  vendor text,
  cost_per_unit numeric,
  category text NOT NULL DEFAULT 'General',
  location text,
  last_updated timestamptz DEFAULT now(),
  organization_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(ingredient_name);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inventory" ON inventory FOR ALL USING (auth.uid() = user_id);
