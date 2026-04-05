-- Create venue_spaces table for managing multiple rooms/spaces within a venue
CREATE TABLE venue_spaces (
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

-- Indexes for common queries
CREATE INDEX idx_venue_spaces_venue ON venue_spaces(venue_profile_id);
CREATE INDEX idx_venue_spaces_org ON venue_spaces(organization_id);

-- Row-level security
ALTER TABLE venue_spaces ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can manage spaces
CREATE POLICY "Org members can manage spaces"
  ON venue_spaces FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = venue_spaces.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Policy: Anyone can view active spaces
CREATE POLICY "Anyone can view active spaces"
  ON venue_spaces FOR SELECT USING (is_active = true);
