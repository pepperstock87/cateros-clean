-- Add cover image URL to recipes for AI-generated food photography
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;

-- Track image generation usage for rate limiting
CREATE TABLE IF NOT EXISTS public.image_generation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('recipe', 'proposal', 'marketing')),
  prompt TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.image_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image generations"
  ON public.image_generation_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image generations"
  ON public.image_generation_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_image_gen_user_date
  ON public.image_generation_log (user_id, created_at DESC);
