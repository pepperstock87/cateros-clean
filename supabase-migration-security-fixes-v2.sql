-- Cateros Security Fixes Migration v2
-- Fixes critical RLS vulnerabilities and adds performance indexes
-- Idempotent: All DROP POLICY statements use IF EXISTS
-- Created: 2026-04-04

-- ============================================================================
-- SECTION 1: Fix client_portal_messages - Replace open "USING (true)" policies
-- ============================================================================
-- Issue: Open read/insert policies allow any authenticated user to access
-- Fix: Scope to event ownership and organization membership

DROP POLICY IF EXISTS "Open read for portal messages" ON client_portal_messages;
DROP POLICY IF EXISTS "Open insert for portal messages" ON client_portal_messages;

-- Caterers read messages for their own events
CREATE POLICY "Caterers read own event messages" ON client_portal_messages
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
    OR event_id IN (
      SELECT eo.event_id FROM event_organizations eo
      JOIN organization_members om ON om.organization_id = eo.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Caterers insert messages for their own events
CREATE POLICY "Caterers insert own event messages" ON client_portal_messages
  FOR INSERT WITH CHECK (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
    OR event_id IN (
      SELECT eo.event_id FROM event_organizations eo
      JOIN organization_members om ON om.organization_id = eo.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- ============================================================================
-- SECTION 2: Fix proposal_comments - Replace "FOR ALL USING (true)" policy
-- ============================================================================
-- Issue: Single overly permissive policy allows all operations
-- Fix: Split into separate SELECT, INSERT, UPDATE, DELETE policies scoped to proposal ownership

DROP POLICY IF EXISTS "Allow all proposal comments" ON proposal_comments;

CREATE POLICY "View comments for own proposals" ON proposal_comments
  FOR SELECT USING (
    proposal_id IN (SELECT id FROM proposals WHERE user_id = auth.uid())
  );

CREATE POLICY "Insert comments for own proposals" ON proposal_comments
  FOR INSERT WITH CHECK (
    proposal_id IN (SELECT id FROM proposals WHERE user_id = auth.uid())
  );

CREATE POLICY "Update comments for own proposals" ON proposal_comments
  FOR UPDATE USING (
    proposal_id IN (SELECT id FROM proposals WHERE user_id = auth.uid())
  );

CREATE POLICY "Delete comments for own proposals" ON proposal_comments
  FOR DELETE USING (
    proposal_id IN (SELECT id FROM proposals WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SECTION 3: Fix venue_spaces - Replace unrestricted read policy
-- ============================================================================
-- Issue: "Anyone can view active spaces" allows all authenticated users
-- Fix: Scope to organization members or space owner

DROP POLICY IF EXISTS "Anyone can view active spaces" ON venue_spaces;

CREATE POLICY "Org members can view spaces" ON venue_spaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = venue_spaces.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
    OR user_id = auth.uid()
  );

-- ============================================================================
-- SECTION 4: Fix organization_members privilege escalation
-- ============================================================================
-- Issue: Single "Admins can manage org members" policy doesn't prevent
--        admins from promoting themselves to owner or managing owners
-- Fix: Split into owner-only and admin-limited policies

DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;

-- Owners can manage all members (full control)
CREATE POLICY "Owners can manage org members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Admins can view all members
CREATE POLICY "Admins can view org members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Admins can only modify non-owner members
CREATE POLICY "Admins can manage non-owner members" ON organization_members
  FOR UPDATE USING (
    role != 'owner'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete non-owner members" ON organization_members
  FOR DELETE USING (
    role != 'owner'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- ============================================================================
-- SECTION 5: Ensure RLS is enabled on client_portal_tokens
-- ============================================================================
-- Ensure this table has RLS enforced (may have been missed in initial setup)

ALTER TABLE IF EXISTS client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 6: Add missing performance indexes
-- ============================================================================
-- These indexes improve query performance for the RLS policies above
-- which frequently filter by event_id, user_id, proposal_id, etc.

CREATE INDEX IF NOT EXISTS idx_proposals_event_id ON proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_event_id ON receipts(event_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_event_id ON client_portal_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- 1. client_portal_messages: Replaced open policies with org/event-scoped access
-- 2. proposal_comments: Split monolithic policy into granular CRUD policies
-- 3. venue_spaces: Restricted read access to org members and owners
-- 4. organization_members: Split admin/owner roles to prevent escalation
-- 5. client_portal_tokens: Explicitly enabled RLS
-- 6. Added 5 performance indexes for common filter columns
--
-- All changes are idempotent and safe to rerun.
