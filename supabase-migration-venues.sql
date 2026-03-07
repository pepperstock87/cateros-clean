-- Venue Infrastructure

CREATE TABLE venue_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  description TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  capacity_seated INT,
  capacity_standing INT,
  website TEXT,
  indoor_outdoor TEXT CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both')),
  indoor_outdoor_notes TEXT,
  parking_notes TEXT,
  access_notes TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id) -- one venue profile per org
);

CREATE INDEX idx_venue_profiles_org_id ON venue_profiles(organization_id);

ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;

-- Org members can manage their venue profile
CREATE POLICY "Org members can manage venue profiles"
  ON venue_profiles FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = venue_profiles.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Anyone can view venue profiles (public info)
CREATE POLICY "Anyone can view venue profiles"
  ON venue_profiles FOR SELECT USING (true);
