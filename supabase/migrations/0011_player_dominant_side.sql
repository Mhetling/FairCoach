ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS dominant_side VARCHAR(1) DEFAULT NULL
  CHECK (dominant_side IN ('R', 'L'));
