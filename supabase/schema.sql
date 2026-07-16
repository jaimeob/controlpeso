create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.proceso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  calories numeric not null,
  portion text not null,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  source text not null default 'IA',
  created_at timestamptz not null default now()
);

alter table public.proceso add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.profiles enable row level security;
alter table public.proceso enable row level security;

drop policy if exists "proceso_public_access" on public.proceso;
drop policy if exists "Users can view their profile" on public.profiles;
drop policy if exists "Users can view their own foods" on public.proceso;
drop policy if exists "Users can add their own foods" on public.proceso;
drop policy if exists "Users can delete their own foods" on public.proceso;

create policy "Users can view their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can view their own foods" on public.proceso for select using (auth.uid() = user_id);
create policy "Users can add their own foods" on public.proceso for insert with check (auth.uid() = user_id);
create policy "Users can delete their own foods" on public.proceso for delete using (auth.uid() = user_id);
