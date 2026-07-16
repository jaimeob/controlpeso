create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'patient' check (role in ('superadmin', 'admin', 'patient')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.proceso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  calories numeric not null,
  portion text not null,
  quantity numeric not null default 1,
  unit text not null default 'pieza' check (unit in ('pieza', 'gramos', 'mililitros')),
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  source text not null default 'IA',
  created_at timestamptz not null default now()
);

create table if not exists public.patient_intakes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  medical_history text,
  chronic_conditions text,
  family_history text,
  allergies text,
  medications text,
  dietary_habits text,
  meal_schedule text,
  food_preferences text,
  food_dislikes text,
  water_intake text,
  cravings text,
  activity_level text,
  sleep_hours text,
  stress_level text,
  occupation text,
  lab_studies text,
  weight_kg numeric,
  height_cm numeric,
  waist_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  daily_calorie_goal numeric not null default 2000,
  goal_weight_kg numeric,
  goal_description text,
  target_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric not null,
  waist_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  created_at timestamptz not null default now()
);

alter table public.proceso add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.proceso add column if not exists quantity numeric not null default 1;
alter table public.proceso add column if not exists unit text not null default 'pieza';
alter table public.patient_intakes add column if not exists daily_calorie_goal numeric not null default 2000;
alter table public.patient_intakes add column if not exists goal_weight_kg numeric;
alter table public.patient_intakes add column if not exists goal_description text;
alter table public.patient_intakes add column if not exists target_date date;
alter table public.profiles add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists roles text[];
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'patient' where role = 'user';
update public.profiles set roles = array[role] where roles is null or cardinality(roles) = 0;
alter table public.profiles alter column roles set default array['patient']::text[];
alter table public.profiles alter column roles set not null;
-- Configura el correo del desarrollador principal como superadmin.
update public.profiles set role = 'superadmin' where email = 'jaimeob63@gmail.com';
update public.profiles patient set created_by = superadmin.id from public.profiles superadmin where patient.created_by is null and patient.role in ('admin', 'patient') and superadmin.role = 'superadmin' and patient.id <> superadmin.id;
alter table public.profiles add constraint profiles_role_check check (role in ('superadmin', 'admin', 'patient'));
alter table public.profiles drop constraint if exists profiles_roles_check;
alter table public.profiles add constraint profiles_roles_check check (roles <@ array['superadmin', 'admin', 'patient']::text[] and cardinality(roles) > 0);
alter table public.profiles enable row level security;
alter table public.proceso enable row level security;
alter table public.patient_intakes enable row level security;
alter table public.patient_measurements enable row level security;

drop policy if exists "proceso_public_access" on public.proceso;
drop policy if exists "Users can view their profile" on public.profiles;
drop policy if exists "Users can view their own foods" on public.proceso;
drop policy if exists "Users can add their own foods" on public.proceso;
drop policy if exists "Users can delete their own foods" on public.proceso;
drop policy if exists "Patients can view their intake" on public.patient_intakes;
drop policy if exists "Patients can update their intake" on public.patient_intakes;
drop policy if exists "Patients can view their measurements" on public.patient_measurements;
drop policy if exists "Patients can add their measurements" on public.patient_measurements;

create policy "Users can view their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can view their own foods" on public.proceso for select using (auth.uid() = user_id);
create policy "Users can add their own foods" on public.proceso for insert with check (auth.uid() = user_id);
create policy "Users can delete their own foods" on public.proceso for delete using (auth.uid() = user_id);
create policy "Patients can view their intake" on public.patient_intakes for select using (auth.uid() = user_id);
create policy "Patients can update their intake" on public.patient_intakes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Patients can view their measurements" on public.patient_measurements for select using (auth.uid() = user_id);
create policy "Patients can add their measurements" on public.patient_measurements for insert with check (auth.uid() = user_id);
