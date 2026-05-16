-- Kids Sport Management — schema
-- Run this in the Supabase SQL Editor for a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Sports (lookup table; soccer active, others coming)
-- ---------------------------------------------------------------
create table if not exists public.sports (
  id          text primary key,
  name        text not null,
  is_active   boolean not null default false,
  sort_order  int not null default 0
);

insert into public.sports (id, name, is_active, sort_order) values
  ('soccer',     'Fotball',    true,  1),
  ('handball',   'Håndball',   false, 2),
  ('basketball', 'Basketball', false, 3),
  ('hockey',     'Hockey',     false, 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Teams: one coach (auth user) owns many teams
-- ---------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sport_id    text not null references public.sports(id),
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists teams_user_id_idx on public.teams(user_id);
create index if not exists teams_sport_id_idx on public.teams(sport_id);

-- ---------------------------------------------------------------
-- Players: belong to a team
-- ---------------------------------------------------------------
create table if not exists public.players (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  name           text not null,
  jersey_number  int,
  position       text, -- 'GK' | 'DEF' | 'MID' | 'FWD' for soccer
  created_at     timestamptz not null default now()
);
create index if not exists players_team_id_idx on public.players(team_id);

-- ---------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------
create table if not exists public.matches (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  team_id                 uuid not null references public.teams(id) on delete cascade,
  opponent                text,
  starts_at               timestamptz,
  players_on_field        int  not null default 7,    -- 5/7/9/11 a-side
  period_length_seconds   int  not null default 1500, -- 25 min default
  period_count            int  not null default 2,
  status                  text not null default 'pending', -- pending | live | paused | finished
  current_period          int  not null default 1,
  elapsed_seconds         int  not null default 0,
  created_at              timestamptz not null default now()
);
create index if not exists matches_user_id_idx on public.matches(user_id);
create index if not exists matches_team_id_idx on public.matches(team_id);

-- ---------------------------------------------------------------
-- Match players: who's selected, where they are, how long they've played
-- ---------------------------------------------------------------
create table if not exists public.match_players (
  match_id            uuid not null references public.matches(id) on delete cascade,
  player_id           uuid not null references public.players(id) on delete cascade,
  selected            boolean not null default true,
  on_field            boolean not null default false,
  current_position    text, -- 'GK', 'DEF', 'MID', 'FWD' or null when on bench
  total_play_seconds  int not null default 0,
  primary key (match_id, player_id)
);

-- ---------------------------------------------------------------
-- Match events: substitution, goal, period_start, period_end, ...
-- ---------------------------------------------------------------
create table if not exists public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid references public.players(id) on delete set null,
  event_type  text not null, -- 'on' | 'off' | 'goal' | 'period_start' | 'period_end' | 'pause' | 'resume'
  position    text,
  at_seconds  int not null,  -- match-relative seconds when event happened
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists match_events_match_id_idx on public.match_events(match_id);

-- ---------------------------------------------------------------
-- Realtime: enable streaming on match tables so the coach can keep a
-- match in sync between phone and tablet.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_players'
  ) then
    alter publication supabase_realtime add table public.match_players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table public.match_events;
  end if;
end $$;
