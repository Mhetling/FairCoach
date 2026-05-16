ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_home integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_away integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS notes text;
