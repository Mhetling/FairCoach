-- Kids Sport Management — Row Level Security
-- Each coach only sees their own teams, players, matches, events.
-- The sports table is a public lookup and readable by anyone signed in.

-- ---------------------------------------------------------------
alter table public.sports         enable row level security;
alter table public.teams          enable row level security;
alter table public.players        enable row level security;
alter table public.matches        enable row level security;
alter table public.match_players  enable row level security;
alter table public.match_events   enable row level security;

-- ---------------------------------------------------------------
-- sports: read-only for authenticated users
-- ---------------------------------------------------------------
drop policy if exists "sports readable" on public.sports;
create policy "sports readable" on public.sports
  for select to authenticated using (true);

-- ---------------------------------------------------------------
-- teams: owner-only
-- ---------------------------------------------------------------
drop policy if exists "teams owner all" on public.teams;
create policy "teams owner all" on public.teams
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- players: access through owning team
-- ---------------------------------------------------------------
drop policy if exists "players via team" on public.players;
create policy "players via team" on public.players
  for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id and t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- matches: owner-only
-- ---------------------------------------------------------------
drop policy if exists "matches owner all" on public.matches;
create policy "matches owner all" on public.matches
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- match_players: access through owning match
-- ---------------------------------------------------------------
drop policy if exists "match_players via match" on public.match_players;
create policy "match_players via match" on public.match_players
  for all to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- match_events: access through owning match
-- ---------------------------------------------------------------
drop policy if exists "match_events via match" on public.match_events;
create policy "match_events via match" on public.match_events
  for all to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_events.match_id and m.user_id = auth.uid()
    )
  );
