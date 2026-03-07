-- Backfill: Create an organization for each existing user and link their data

-- Step 1: Create organizations from profiles
INSERT INTO organizations (id, name, slug, organization_type, primary_contact_email, created_at)
SELECT
  gen_random_uuid(),
  COALESCE(p.company_name, p.full_name, p.email),
  LOWER(REPLACE(COALESCE(p.company_name, p.full_name, split_part(p.email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(p.id::text, 1, 8),
  'caterer',
  p.email,
  p.created_at
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om WHERE om.user_id = p.id
);

-- Step 2: Create membership records (owner role)
INSERT INTO organization_members (organization_id, user_id, role, status)
SELECT o.id, p.id, 'owner', 'active'
FROM profiles p
JOIN organizations o ON o.primary_contact_email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om WHERE om.user_id = p.id
);

-- Step 3: Set current_organization_id on profiles
UPDATE profiles p
SET current_organization_id = om.organization_id
FROM organization_members om
WHERE om.user_id = p.id AND p.current_organization_id IS NULL;

-- Step 4: Backfill organization_id on all data tables
UPDATE events SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = events.user_id) WHERE organization_id IS NULL;
UPDATE proposals SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = proposals.user_id) WHERE organization_id IS NULL;
UPDATE recipes SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = recipes.user_id) WHERE organization_id IS NULL;
UPDATE staff_members SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = staff_members.user_id) WHERE organization_id IS NULL;
UPDATE event_staff_assignments SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = event_staff_assignments.user_id) WHERE organization_id IS NULL;
UPDATE rental_items SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = rental_items.user_id) WHERE organization_id IS NULL;
UPDATE event_templates SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = event_templates.user_id) WHERE organization_id IS NULL;
UPDATE receipts SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = receipts.user_id) WHERE organization_id IS NULL;
UPDATE distributor_invoices SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = distributor_invoices.user_id) WHERE organization_id IS NULL;
UPDATE recurring_costs SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = recurring_costs.user_id) WHERE organization_id IS NULL;
UPDATE ai_conversations SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = ai_conversations.user_id) WHERE organization_id IS NULL;
UPDATE client_notes SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = client_notes.user_id) WHERE organization_id IS NULL;
UPDATE event_activity SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = event_activity.user_id) WHERE organization_id IS NULL;
UPDATE notifications SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = notifications.user_id) WHERE organization_id IS NULL;
UPDATE business_settings SET organization_id = (SELECT current_organization_id FROM profiles WHERE id = business_settings.user_id) WHERE organization_id IS NULL;
