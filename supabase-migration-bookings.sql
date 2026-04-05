-- Venue space bookings / holds
CREATE TABLE venue_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES venue_spaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  setup_start TIME,
  teardown_end TIME,
  status TEXT DEFAULT 'hold' CHECK (status IN ('hold', 'confirmed', 'canceled')),
  rental_fee NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_bookings_space ON venue_bookings(space_id);
CREATE INDEX idx_venue_bookings_date ON venue_bookings(booking_date);
CREATE INDEX idx_venue_bookings_org ON venue_bookings(organization_id);

-- Prevent overlapping bookings on the same space+date+time
CREATE UNIQUE INDEX idx_no_double_booking
  ON venue_bookings(space_id, booking_date)
  WHERE status != 'canceled';

ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage bookings"
  ON venue_bookings FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = venue_bookings.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Availability blocks (recurring blocked/available times)
CREATE TABLE venue_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES venue_spaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT CHECK (block_type IN ('available', 'blocked', 'maintenance')),
  label TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE venue_availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage availability"
  ON venue_availability_blocks FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = venue_availability_blocks.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Trigger for updated_at on bookings
CREATE OR REPLACE FUNCTION public.handle_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_bookings_updated_at BEFORE UPDATE ON venue_bookings FOR EACH ROW EXECUTE FUNCTION public.handle_booking_updated_at();
