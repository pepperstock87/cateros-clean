-- CaterOS Database Migrations
-- Run these in Supabase SQL Editor

-- 1. Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  custom_message TEXT,
  terms TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own proposals" ON proposals
  FOR ALL USING (auth.uid() = user_id);

-- 2. Recipe case pricing columns
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS case_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS units_per_case DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS case_unit_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS yield_percent DECIMAL(5,2) DEFAULT 100;

-- 3. Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  vendor VARCHAR(255),
  receipt_date DATE,
  total_amount DECIMAL(10,2),
  category VARCHAR(50),
  week_label VARCHAR(50),
  file_url TEXT,
  extracted_data JSONB,
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own receipts" ON receipts
  FOR ALL USING (auth.uid() = user_id);

-- 4. Distributor invoices table
CREATE TABLE IF NOT EXISTS distributor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  distributor VARCHAR(255) NOT NULL,
  invoice_date DATE,
  invoice_number VARCHAR(100),
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  line_items JSONB,
  file_url TEXT,
  extracted_data JSONB,
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE distributor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own invoices" ON distributor_invoices
  FOR ALL USING (auth.uid() = user_id);

-- 5. AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

-- 6. Business settings brand_color column
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) DEFAULT '#1a1a1a';

-- 7. Proposal share token for client sharing
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(32) UNIQUE;

-- 8. Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 25,
  phone VARCHAR(30),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own staff" ON staff_members
  FOR ALL USING (auth.uid() = user_id);

-- 9. Event payment tracking
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_data JSONB;

-- 10. Event time and contact fields
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(30);

-- 11. Rental items library
CREATE TABLE IF NOT EXISTS rental_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  vendor VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own rental items" ON rental_items
  FOR ALL USING (auth.uid() = user_id);

-- 12. Proposal client interaction fields
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS client_messages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;

-- Allow public read of proposals by share_token (for client responses)
CREATE POLICY "Public can read proposals by share_token" ON proposals
  FOR SELECT USING (share_token IS NOT NULL);

-- 13. Event staff assignments
CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(100),
  start_time TIME,
  end_time TIME,
  confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own staff assignments" ON event_staff_assignments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_event ON event_staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff ON event_staff_assignments(staff_member_id);

-- 14. Profile welcome flag
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- 15. Recurring costs table
CREATE TABLE IF NOT EXISTS recurring_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'monthly',
  category VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recurring costs" ON recurring_costs
  FOR ALL USING (auth.uid() = user_id);
