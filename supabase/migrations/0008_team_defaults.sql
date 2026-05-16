ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_players_on_field integer;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_period_length_seconds integer;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_period_count integer;
