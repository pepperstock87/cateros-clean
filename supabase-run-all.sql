-- ============================================================
-- CATEROS: Run in Supabase SQL Editor (in this exact order)
-- ============================================================

-- ============================================================
-- PART 1: NEW TABLES — Venue Spaces
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_profile_id UUID NOT NULL REFERENCES venue_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  space_type TEXT CHECK (space_type IN ('ballroom', 'conference_room', 'outdoor_garden', 'patio', 'rooftop', 'dining_room', 'ceremony_space', 'cocktail_lounge', 'tent', 'other')),
  capacity_seated INT,
  capacity_standing INT,
  square_footage INT,
  hourly_rate NUMERIC(10,2),
  daily_rate NUMERIC(10,2),
  half_day_rate NUMERIC(10,2),
  setup_time_minutes INT DEFAULT 60,
  teardown_time_minutes INT DEFAULT 60,
  indoor_outdoor TEXT CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'covered_outdoor')),
  amenities JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_spaces_venue ON venue_spaces(venue_profile_id);
CREATE INDEX IF NOT EXISTS idx_venue_spaces_org ON venue_spaces(organization_id);

ALTER TABLE venue_spaces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Org members can manage spaces"
    ON venue_spaces FOR ALL USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = venue_spaces.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active spaces"
    ON venue_spaces FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 2: NEW TABLES — Venue Bookings
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES venue_spaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  setup_start TIME,
  teardown_end TIME,
  status TEXT DEFAULT 'hold' CHECK (status IN ('hold', 'confirmed', 'canceled')),
  rental_fee NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_space ON venue_bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_date ON venue_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_org ON venue_bookings(organization_id);

-- Prevent double-booking same space on same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking
  ON venue_bookings(space_id, booking_date)
  WHERE status != 'canceled';

ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Org members can manage bookings"
    ON venue_bookings FOR ALL USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = venue_bookings.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 3: NEW TABLES — Availability Blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES venue_spaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT CHECK (block_type IN ('available', 'blocked', 'maintenance')),
  label TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE venue_availability_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Org members can manage availability"
    ON venue_availability_blocks FOR ALL USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = venue_availability_blocks.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger for updated_at on bookings
CREATE OR REPLACE FUNCTION public.handle_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS venue_bookings_updated_at ON venue_bookings;
CREATE TRIGGER venue_bookings_updated_at BEFORE UPDATE ON venue_bookings FOR EACH ROW EXECUTE FUNCTION public.handle_booking_updated_at();

-- ============================================================
-- PART 4: WIPE ALL USER DATA (clean slate)
-- Order matters: delete children before parents
-- ============================================================

-- Production / prep data
DELETE FROM event_pack_items WHERE true;
DELETE FROM event_shopping_items WHERE true;
DELETE FROM event_prep_items WHERE true;

-- Venue bookings & availability (new tables)
DELETE FROM venue_availability_blocks WHERE true;
DELETE FROM venue_bookings WHERE true;

-- Proposals & contracts
DELETE FROM contract_acceptances WHERE true;
DELETE FROM portal_messages WHERE true;
DELETE FROM proposals WHERE true;

-- Event relationships
DELETE FROM event_staff_assignments WHERE true;
DELETE FROM event_invites WHERE true;
DELETE FROM event_organizations WHERE true;
DELETE FROM menu_item_recipes WHERE true;

-- Events
DELETE FROM events WHERE true;

-- Recipes
DELETE FROM recipes WHERE true;

-- Staff
DELETE FROM staff_members WHERE true;

-- Clients
DELETE FROM clients WHERE true;

-- Invoices / payments
DELETE FROM invoice_line_items WHERE true;
DELETE FROM invoices WHERE true;
DELETE FROM payment_schedules WHERE true;

-- Templates
DELETE FROM event_templates WHERE true;

-- Activity & audit logs
DELETE FROM activity_log WHERE true;
DELETE FROM audit_log WHERE true;

-- Notifications
DELETE FROM notifications WHERE true;

-- Venue spaces (keep venue_profiles — that's org config, not user data)
DELETE FROM venue_spaces WHERE true;

-- NOTE: We do NOT delete profiles, organizations, organization_members,
-- business_settings, or venue_profiles — those are account config, not event data.

SELECT 'All user data wiped. Account settings preserved.' as result;
