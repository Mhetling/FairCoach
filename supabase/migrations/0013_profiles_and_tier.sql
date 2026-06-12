-- ─── Profiles: one row per auth user, stores subscription tier ───────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free', 'pro')),
  pro_until  timestamptz default null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles owner all" on public.profiles;
create policy "profiles owner all" on public.profiles
  for all to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a free profile on first sign-in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Back-fill existing users
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
