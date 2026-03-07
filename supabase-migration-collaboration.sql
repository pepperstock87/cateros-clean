-- Event Collaboration Layer: allow multiple organizations on an event

CREATE TABLE event_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('caterer', 'venue', 'planner', 'rental_vendor', 'florist', 'entertainment_vendor', 'other_vendor')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  role_label TEXT, -- custom label like "Lead Caterer", "Floral Design"
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'declined', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, organization_id)
);

-- Indexes
CREATE INDEX idx_event_organizations_event_id ON event_organizations(event_id);
CREATE INDEX idx_event_organizations_org_id ON event_organizations(organization_id);

-- RLS
ALTER TABLE event_organizations ENABLE ROW LEVEL SECURITY;

-- Event owner can manage collaborators
CREATE POLICY "Event owners can manage collaborators"
  ON event_organizations FOR ALL USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_organizations.event_id AND e.user_id = auth.uid())
  );

-- Organization members can view their participation
CREATE POLICY "Org members can view their participation"
  ON event_organizations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = event_organizations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );
