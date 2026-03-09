-- Team Invites Migration
-- Adds organization_invites table for team member invitation workflow

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- RLS: Members of the org can view invites
CREATE POLICY "Members can view org invites" ON organization_invites
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- RLS: Admins can manage invites
CREATE POLICY "Admins can manage org invites" ON organization_invites
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- RLS: Anyone can view their own invites by email (for accepting)
CREATE POLICY "Users can view invites for their email" ON organization_invites
  FOR SELECT USING (invited_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);

-- Trigger for updated_at
CREATE TRIGGER organization_invites_updated_at
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
