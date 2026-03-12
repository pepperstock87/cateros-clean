-- Migration: Distributor Integration Layer
-- Transport-agnostic distributor connectivity with normalized data model.
-- Supports API, webhook, EDI, SFTP, file upload, and manual CSV.

-- ─── Distributors ───

CREATE TABLE IF NOT EXISTS distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  connector_type text NOT NULL, -- 'pfg', 'sysco', 'usfoods', 'baldor', 'custom'
  transport text NOT NULL, -- 'api', 'webhook', 'edi', 'sftp', 'file_upload', 'manual_csv'
  config jsonb DEFAULT '{}', -- SFTP creds, API keys, EDI IDs, column mappings
  is_active boolean NOT NULL DEFAULT true,
  account_number text,
  rep_name text,
  rep_email text,
  rep_phone text,
  default_delivery_address text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_distributors_user ON distributors(user_id, is_active);
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own distributors" ON distributors FOR ALL USING (auth.uid() = user_id);

-- ─── Distributor Products (SKU Catalog) ───

CREATE TABLE IF NOT EXISTS distributor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  brand text,
  pack_size text, -- e.g., "6/10#", "4/1gal"
  unit text, -- each, case, lb
  unit_price numeric(10,4),
  price_effective_date date,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(distributor_id, sku)
);

CREATE INDEX idx_dist_products_distributor ON distributor_products(distributor_id, is_active);
CREATE INDEX idx_dist_products_sku ON distributor_products(sku);
ALTER TABLE distributor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access distributor products via distributor"
  ON distributor_products FOR ALL
  USING (EXISTS (SELECT 1 FROM distributors d WHERE d.id = distributor_id AND d.user_id = auth.uid()));

-- ─── Product Mappings (SKU ↔ Ingredient, many-to-many) ───

CREATE TABLE IF NOT EXISTS distributor_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  distributor_product_id uuid NOT NULL REFERENCES distributor_products(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory(id) ON DELETE SET NULL,
  ingredient_name text NOT NULL,
  conversion_factor numeric(10,4) NOT NULL DEFAULT 1,
  conversion_unit text,
  is_preferred boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(distributor_product_id, inventory_item_id)
);

CREATE INDEX idx_dist_mappings_inventory ON distributor_product_mappings(inventory_item_id);
CREATE INDEX idx_dist_mappings_product ON distributor_product_mappings(distributor_product_id);
ALTER TABLE distributor_product_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access mappings via distributor product"
  ON distributor_product_mappings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM distributor_products dp
    JOIN distributors d ON d.id = dp.distributor_id
    WHERE dp.id = distributor_product_id AND d.user_id = auth.uid()
  ));

-- ─── Purchase Orders ───

CREATE TABLE IF NOT EXISTS distributor_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_number text,
  status text NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date date,
  actual_delivery_date date,
  delivery_address text,
  notes text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  event_ids uuid[] DEFAULT '{}',
  external_order_id text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dist_orders_user ON distributor_orders(user_id, status);
CREATE INDEX idx_dist_orders_distributor ON distributor_orders(distributor_id);
ALTER TABLE distributor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orders" ON distributor_orders FOR ALL USING (auth.uid() = user_id);

-- ─── Purchase Order Lines ───

CREATE TABLE IF NOT EXISTS distributor_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES distributor_orders(id) ON DELETE CASCADE,
  distributor_product_id uuid REFERENCES distributor_products(id) ON DELETE SET NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity_ordered numeric(10,3) NOT NULL,
  quantity_received numeric(10,3),
  unit text,
  unit_price numeric(10,4) NOT NULL,
  extended_price numeric(10,2) NOT NULL,
  substitution_sku text,
  substitution_name text,
  notes text
);

CREATE INDEX idx_dist_order_lines_order ON distributor_order_lines(order_id);
ALTER TABLE distributor_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access order lines via order"
  ON distributor_order_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM distributor_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ─── Distributor Invoices ───

CREATE TABLE IF NOT EXISTS distributor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_id uuid REFERENCES distributor_orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  pdf_url text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dist_invoices_user ON distributor_invoices(user_id, status);
CREATE INDEX idx_dist_invoices_distributor ON distributor_invoices(distributor_id);
CREATE INDEX idx_dist_invoices_number ON distributor_invoices(distributor_id, invoice_number);
ALTER TABLE distributor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invoices" ON distributor_invoices FOR ALL USING (auth.uid() = user_id);

-- ─── Invoice Line Items ───

CREATE TABLE IF NOT EXISTS distributor_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES distributor_invoices(id) ON DELETE CASCADE,
  distributor_product_id uuid REFERENCES distributor_products(id) ON DELETE SET NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit text,
  unit_price numeric(10,4) NOT NULL,
  extended_price numeric(10,2) NOT NULL,
  order_line_id uuid REFERENCES distributor_order_lines(id) ON DELETE SET NULL,
  variance_flag boolean NOT NULL DEFAULT false,
  notes text
);

CREATE INDEX idx_dist_invoice_lines_invoice ON distributor_invoice_lines(invoice_id);
ALTER TABLE distributor_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access invoice lines via invoice"
  ON distributor_invoice_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM distributor_invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));

-- ─── Credits / Returns ───

CREATE TABLE IF NOT EXISTS distributor_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES distributor_invoices(id) ON DELETE SET NULL,
  credit_number text,
  amount numeric(10,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE distributor_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own credits" ON distributor_credits FOR ALL USING (auth.uid() = user_id);

-- ─── Sync Jobs ───

CREATE TABLE IF NOT EXISTS distributor_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  job_type text NOT NULL, -- catalog_import, order_export, invoice_import, delivery_update, price_update
  transport text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  idempotency_key text UNIQUE NOT NULL,
  input_file_url text,
  input_data jsonb,
  result jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dist_sync_jobs_user ON distributor_sync_jobs(user_id, created_at DESC);
CREATE INDEX idx_dist_sync_jobs_retry ON distributor_sync_jobs(status, next_retry_at)
  WHERE status = 'queued';
ALTER TABLE distributor_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync jobs" ON distributor_sync_jobs FOR ALL USING (auth.uid() = user_id);
