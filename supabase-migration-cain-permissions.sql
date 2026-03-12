-- Migration: Add CAIN permissions column to business_settings
-- Stores per-user CAIN tool permission overrides as JSONB
-- Structure: { "overrides": { "tool_name": "suggest" | "draft-confirm" | "auto-execute" }, "globalMode": "..." }

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS cain_permissions jsonb DEFAULT NULL;

COMMENT ON COLUMN business_settings.cain_permissions IS 'CAIN AI agent permission configuration. Controls which tools can auto-execute vs require confirmation.';
