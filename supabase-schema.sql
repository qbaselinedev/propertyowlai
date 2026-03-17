-- =============================================
-- PropertyOwl AI — Supabase Database Schema
-- Run this in: Supabase → SQL Editor → New Query
-- =============================================

-- PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  credits integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PROPERTIES
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  nickname text,
  address text not null,
  suburb text,
  state text default 'VIC',
  postcode text,
  price numeric,
  property_type text,
  bedrooms integer,
  bathrooms integer,
  car_spaces integer,
  land_size numeric,
  listing_url text,
  agent_name text,
  council text,
  planning_zone text,
  days_on_market integer,
  risk_score integer,
  s32_reviewed boolean default false,
  scan_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REPORTS
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in ('s32_review', 'online_scan')),
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  risk_score integer,
  risk_label text,
  red_flag_count integer default 0,
  amber_count integer default 0,
  result_json jsonb,
  file_path text,
  credits_used integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- APP SETTINGS (for admin portal)
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Insert default LLM settings
insert into public.app_settings (key, value) values (
  'llm',
  '{
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 4000,
    "s32_prompt": "You are PropertyOwl AI, an expert Victorian property analyst specialising in Section 32 Vendor Statements and Contracts of Sale under the Sale of Land Act 1962 (Vic). Analyse the attached document thoroughly and provide a structured JSON response.",
    "scan_prompt": "You are PropertyOwl AI, researching a Victorian property for a potential buyer. Based on the property details provided, give a comprehensive intelligence analysis in structured JSON format."
  }'::jsonb
);

-- Insert default content settings
insert into public.app_settings (key, value) values (
  'content',
  '{
    "hero_title": "Know what you'\''re buying before you sign.",
    "hero_subtitle": "AI-powered Section 32 and Contract of Sale reviews for Victorian property buyers.",
    "disclaimer": "PropertyOwl AI is an informal review tool. Not legal advice. Always verify with a licensed Victorian conveyancer.",
    "support_email": "support@propertyowlai.com"
  }'::jsonb
);

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.reports enable row level security;
alter table public.app_settings enable row level security;

-- Profiles: users can only see their own
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Properties: users can only see their own
create policy "Users can view own properties" on public.properties
  for select using (auth.uid() = user_id);

create policy "Users can insert own properties" on public.properties
  for insert with check (auth.uid() = user_id);

create policy "Users can update own properties" on public.properties
  for update using (auth.uid() = user_id);

create policy "Users can delete own properties" on public.properties
  for delete using (auth.uid() = user_id);

-- Reports: users can only see their own
create policy "Users can view own reports" on public.reports
  for select using (auth.uid() = user_id);

create policy "Users can insert own reports" on public.reports
  for insert with check (auth.uid() = user_id);

-- App settings: public read, admin write only
create policy "Anyone can read settings" on public.app_settings
  for select using (true);

-- =============================================
-- TO MAKE YOURSELF ADMIN:
-- After signing up, run this (replace with your email):
-- update public.profiles set role = 'admin' where email = 'your@email.com';
-- =============================================
