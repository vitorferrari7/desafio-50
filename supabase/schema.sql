-- Execute este arquivo no SQL Editor do seu projeto Supabase.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at timestamptz not null default now()
);

create table public.challenge_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.challenge_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.challenge_groups(id) on delete cascade,
  challenge_day smallint not null check (challenge_day between 1 and 50),
  distance_km numeric(6,2) not null check (distance_km > 0),
  activity_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, challenge_day)
);

alter table public.profiles enable row level security;
alter table public.challenge_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.activities enable row level security;

create policy "Profiles are visible to signed-in users" on public.profiles for select to authenticated using (true);
create policy "Users create their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update their own profile" on public.profiles for update to authenticated using (auth.uid() = id);
-- O código é a chave de entrada do grupo; os demais dados do grupo não são sensíveis.
create policy "Authenticated users find groups by code" on public.challenge_groups for select to authenticated using (true);
create policy "Users create groups" on public.challenge_groups for insert to authenticated with check (auth.uid() = created_by);
create policy "Members see group members" on public.group_members for select to authenticated using (group_id in (select group_id from public.group_members where user_id = auth.uid()));
create policy "Users join groups" on public.group_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Members see group activities" on public.activities for select to authenticated using (group_id in (select group_id from public.group_members where user_id = auth.uid()));
create policy "Users manage own activities" on public.activities for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and group_id in (select group_id from public.group_members where user_id = auth.uid()));
