-- Phase 10: Organization-level subscriptions and feature flags
-- This evolves the existing user-level subscription system (profiles.plan_tier)
-- to organization-level while keeping backward compatibility.

-- Organization subscriptions table
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  plans TEXT[] NOT NULL DEFAULT '{}', -- which plans include this feature, e.g. {'pro', 'enterprise'}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default feature flags
INSERT INTO feature_flags (feature_key, feature_name, description, plans) VALUES
  ('advanced_reports', 'Advanced Production Reports', 'Detailed event production and cost reports', '{"pro", "enterprise"}'),
  ('staff_scheduling', 'Staff Scheduling', 'Advanced staff scheduling and availability tracking', '{"pro", "enterprise"}'),
  ('vendor_collaboration', 'Vendor Collaboration', 'Multi-vendor event collaboration tools', '{"pro", "enterprise"}'),
  ('venue_management', 'Venue Management', 'Venue profiles and booking infrastructure', '{"pro", "enterprise"}'),
  ('analytics_dashboards', 'Analytics Dashboards', 'Revenue forecasting and business analytics', '{"pro", "enterprise"}'),
  ('ai_assistant', 'AI Assistant', 'AI-powered business copilot', '{"pro", "enterprise"}'),
  ('recipe_analytics', 'Recipe Analytics', 'Recipe profitability and cost analysis', '{"pro", "enterprise"}'),
  ('csv_exports', 'CSV & PDF Exports', 'Data export capabilities', '{"pro", "enterprise"}'),
  ('custom_branding', 'Custom Branding', 'Custom proposal branding and logos', '{"pro", "enterprise"}'),
  ('payment_processing', 'Payment Processing', 'Stripe payment collection from clients', '{"enterprise"}'),
  ('multi_team', 'Multi-Team Members', 'More than 3 team members', '{"pro", "enterprise"}'),
  ('api_access', 'API Access', 'REST API access for integrations', '{"enterprise"}'),
  ('priority_support', 'Priority Support', 'Dedicated support channel', '{"enterprise"}');

-- Indexes
CREATE INDEX idx_org_subscriptions_org_id ON organization_subscriptions(organization_id);

-- Enable RLS
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org members can view their subscription"
  ON organization_subscriptions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_subscriptions.organization_id
      AND om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT USING (true);
