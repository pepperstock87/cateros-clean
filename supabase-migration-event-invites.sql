-- Phase 8: Event Invite System
-- Enables invite links for vendors to join event workspaces

CREATE TABLE event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token TEXT NOT NULL UNIQUE,
  relationship_type TEXT NOT NULL DEFAULT 'other_vendor' CHECK (relationship_type IN ('caterer', 'venue', 'planner', 'rental_vendor', 'florist', 'entertainment_vendor', 'other_vendor')),
  role_label TEXT,
  invited_email TEXT,
  invited_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_invites_token ON event_invites(invite_token);
CREATE INDEX idx_event_invites_event_id ON event_invites(event_id);

ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can manage invites"
  ON event_invites FOR ALL USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_invites.event_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Invited users can view their invites"
  ON event_invites FOR SELECT USING (
    accepted_by = auth.uid() OR invited_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
