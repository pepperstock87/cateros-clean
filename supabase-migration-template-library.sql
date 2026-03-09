-- Template Library migration
-- Adds new columns to event_templates for the expanded template system

-- Add new columns
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'pricing';
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS template_data JSONB;
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing data: copy pricing_data into template_data for existing templates
UPDATE event_templates
SET template_data = pricing_data,
    category = 'pricing',
    updated_at = created_at
WHERE template_data IS NULL AND pricing_data IS NOT NULL;
