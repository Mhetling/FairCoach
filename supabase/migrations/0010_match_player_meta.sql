-- Add meta JSONB to match_players for per-match notes and position zones.
-- meta shape: { note?: string; zones?: string[] }
-- zones values: 'keeper' | 'back' | 'midt' | 'angrep'
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;
