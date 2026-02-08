-- DevQuest Supabase Schema

-- 1. Users Profile Table
create table if not exists public.users_profile (
  id uuid default gen_random_uuid() primary key,
  user_id text not null unique, -- Maps to Clerk User ID
  username text,
  avatar_url text,
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  badges text[] default '{}',
  last_active timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. Missions Completed Table
create table if not exists public.missions_completed (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Maps to Clerk User ID
  mission_id text not null,
  xp_earned integer not null,
  completed_at timestamptz default now(),
  constraint fk_user foreign key (user_id) references public.users_profile(user_id)
);

-- 3. Indexes for Performance
create index if not exists idx_users_profile_user_id on public.users_profile(user_id);
create index if not exists idx_missions_completed_user_id on public.missions_completed(user_id);

-- 4. Row Level Security (RLS)
alter table public.users_profile enable row level security;
alter table public.missions_completed enable row level security;

-- Policy: Allow all operations for now (Client-side filtering must be trusted until JWT setup)
create policy "Enable all access for anon" on public.users_profile for all using (true) with check (true);
create policy "Enable all access for anon" on public.missions_completed for all using (true) with check (true);
