-- Role-Based Onboarding: Add business type, primary goal, and module config to profiles
-- Also creates business_type_configs lookup table with seed data

-- Add role columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'caterer'
    CHECK (business_type IN (
      'caterer','restaurant','private_chef','venue',
      'event_planner','florist','band_entertainment',
      'rental_company','hospitality_management','other'
    )),
  ADD COLUMN IF NOT EXISTS primary_goal TEXT DEFAULT 'manage_events'
    CHECK (primary_goal IN (
      'book_more_business','manage_events','create_proposals',
      'organize_staff','track_costs','coordinate_vendors',
      'run_production','build_client_relationships'
    )),
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT ARRAY['events','crm','calendar','billing'],
  ADD COLUMN IF NOT EXISTS secondary_business_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_role_completed BOOLEAN DEFAULT FALSE;

-- Business type configuration table (public read, admin-only write)
CREATE TABLE IF NOT EXISTS public.business_type_configs (
  business_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  default_modules TEXT[] NOT NULL,
  default_nav_order TEXT[] NOT NULL,
  terminology JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- RLS: public read only
ALTER TABLE public.business_type_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business type configs"
  ON public.business_type_configs
  FOR SELECT
  USING (true);

-- Seed business type configs
INSERT INTO public.business_type_configs (business_type, display_name, default_modules, default_nav_order, terminology)
VALUES
  ('caterer', 'Caterer',
    ARRAY['events','cain','recipes','staff','proposals','shopping','production','schedule','clients','calendar','billing'],
    ARRAY['events','cain','recipes','staff','proposals','shopping','production','schedule'],
    '{}'::JSONB),

  ('restaurant', 'Restaurant',
    ARRAY['events','recipes','staff','inventory','spending','clients','calendar','billing'],
    ARRAY['events','recipes','staff','inventory','spending'],
    '{"event": "Private Event"}'::JSONB),

  ('private_chef', 'Private Chef',
    ARRAY['events','recipes','shopping','proposals','clients','calendar','billing'],
    ARRAY['events','recipes','shopping','proposals','clients'],
    '{"event": "Dinner"}'::JSONB),

  ('venue', 'Venue',
    ARRAY['events','schedule','venues','proposals','templates','staff','clients','calendar','billing'],
    ARRAY['events','schedule','venues','proposals','templates','staff'],
    '{"event": "Booking", "proposal": "Quote", "client": "Guest"}'::JSONB),

  ('event_planner', 'Event Planner',
    ARRAY['events','clients','staff','proposals','templates','schedule','calendar','billing'],
    ARRAY['events','clients','staff','proposals','templates','schedule'],
    '{"staff": "Vendors"}'::JSONB),

  ('florist', 'Florist',
    ARRAY['events','inventory','schedule','proposals','templates','clients','calendar','billing'],
    ARRAY['events','inventory','schedule','proposals','templates'],
    '{"event": "Job", "inventory": "Stems & Supplies", "proposal": "Floral Quote"}'::JSONB),

  ('band_entertainment', 'Band or Entertainment',
    ARRAY['events','schedule','proposals','billing','clients','calendar'],
    ARRAY['events','schedule','proposals','billing'],
    '{"event": "Gig", "proposal": "Contract", "staff": "Band Members"}'::JSONB),

  ('rental_company', 'Rental Company',
    ARRAY['events','inventory','schedule','proposals','billing','clients','calendar'],
    ARRAY['events','inventory','schedule','proposals','billing'],
    '{"event": "Reservation", "inventory": "Equipment", "proposal": "Rental Quote"}'::JSONB),

  ('hospitality_management', 'Hospitality Management',
    ARRAY['events','staff','clients','proposals','reports','billing','calendar'],
    ARRAY['events','staff','clients','proposals','reports','billing'],
    '{}'::JSONB),

  ('other', 'Other Vendor',
    ARRAY['events','clients','proposals','billing','schedule','calendar'],
    ARRAY['events','clients','proposals','billing','schedule'],
    '{}'::JSONB)
ON CONFLICT (business_type) DO NOTHING;
