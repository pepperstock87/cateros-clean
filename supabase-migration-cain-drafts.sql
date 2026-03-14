-- Migration: Create cain_drafts table for durable draft persistence
-- This allows CAIN sessions to survive page refreshes, navigation, and errors

CREATE TABLE IF NOT EXISTS public.cain_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'committed', 'abandoned')),
  messages JSONB DEFAULT '[]',
  plan JSONB,
  show_review BOOLEAN DEFAULT false,
  last_input TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of active drafts per user
CREATE INDEX IF NOT EXISTS idx_cain_drafts_user_status ON public.cain_drafts (user_id, status);

-- Auto-update updated_at timestamp
CREATE TRIGGER set_cain_drafts_updated_at
  BEFORE UPDATE ON public.cain_drafts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RLS policies
ALTER TABLE public.cain_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON public.cain_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drafts"
  ON public.cain_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON public.cain_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON public.cain_drafts FOR DELETE
  USING (auth.uid() = user_id);
