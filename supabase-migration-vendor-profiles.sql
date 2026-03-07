CREATE TABLE vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('caterer', 'venue', 'florist', 'photographer', 'planner', 'rental_company', 'band_dj', 'other')),
  description TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  specialties JSONB DEFAULT '[]'::jsonb,
  service_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_vendor_profiles_category ON vendor_profiles(category);
CREATE INDEX idx_vendor_profiles_org_id ON vendor_profiles(organization_id);

ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage their vendor profile"
  ON vendor_profiles FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = vendor_profiles.organization_id
      AND om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Anyone can view vendor profiles"
  ON vendor_profiles FOR SELECT USING (true);
