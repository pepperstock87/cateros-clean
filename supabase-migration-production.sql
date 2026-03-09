-- Menu item to recipe relationships
CREATE TABLE IF NOT EXISTS menu_item_recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  menu_item_name text NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  quantity_per_serving numeric DEFAULT 1,
  unit text DEFAULT 'serving',
  yield_override numeric,
  station text,
  notes text,
  organization_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Event production sheets (versioned)
CREATE TABLE IF NOT EXISTS event_production_sheets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  version integer DEFAULT 1,
  generated_at timestamptz DEFAULT now(),
  notes text
);

-- Event prep items
CREATE TABLE IF NOT EXISTS event_prep_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  production_sheet_id uuid REFERENCES event_production_sheets(id) ON DELETE CASCADE,
  menu_item_name text NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name text,
  component_name text NOT NULL,
  required_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  station text,
  prep_notes text,
  is_manual boolean DEFAULT false,
  group_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Event shopping items
CREATE TABLE IF NOT EXISTS event_shopping_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  production_sheet_id uuid REFERENCES event_production_sheets(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  vendor text,
  purchased boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Event pack items
CREATE TABLE IF NOT EXISTS event_pack_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT 'General',
  packed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Event timeline items
CREATE TABLE IF NOT EXISTS event_timeline_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  phase text NOT NULL DEFAULT 'day_of',
  task text NOT NULL,
  sort_order integer DEFAULT 0,
  completed boolean DEFAULT false,
  assigned_to text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add station field to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS station text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_item_recipes_user ON menu_item_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_recipes_name ON menu_item_recipes(menu_item_name);
CREATE INDEX IF NOT EXISTS idx_event_prep_items_event ON event_prep_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_shopping_items_event ON event_shopping_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_pack_items_event ON event_pack_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_timeline_items_event ON event_timeline_items(event_id);

-- RLS for all production tables
ALTER TABLE menu_item_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own menu_item_recipes" ON menu_item_recipes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE event_production_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own production sheets" ON event_production_sheets FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

ALTER TABLE event_prep_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prep items" ON event_prep_items FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

ALTER TABLE event_shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shopping items" ON event_shopping_items FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

ALTER TABLE event_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pack items" ON event_pack_items FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

ALTER TABLE event_timeline_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own timeline items" ON event_timeline_items FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));
