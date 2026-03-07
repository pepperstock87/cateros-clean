-- Add business defaults to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_admin_fee DECIMAL(5,2) DEFAULT 20;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 8.875;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_target_margin DECIMAL(5,2) DEFAULT 35;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_deposit_percent INTEGER DEFAULT 50;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS service_charge_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS notification_proposals BOOLEAN DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS notification_payments BOOLEAN DEFAULT true;
