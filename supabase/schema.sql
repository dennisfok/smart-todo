-- Smart Todo App - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null,
  description text,
  importance text check (importance in ('high', 'medium', 'low')) default 'medium',
  start_time timestamptz,
  end_time timestamptz,
  is_fixed boolean default false,
  is_completed boolean default false,
  parent_id uuid references tasks(id) on delete cascade,
  google_event_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Settings table
create table if not exists settings (
  id uuid default gen_random_uuid() primary key,
  user_id text unique not null,
  work_days int[] default '{1,2,3,4,5}',
  work_start text default '09:00',
  work_end text default '18:00',
  google_calendar_id text default 'primary',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table tasks enable row level security;
alter table settings enable row level security;

-- Policies: users can only see/edit their own data
create policy "Users can manage their own tasks"
  on tasks for all
  using (user_id = current_setting('app.user_id', true));

create policy "Users can manage their own settings"
  on settings for all
  using (user_id = current_setting('app.user_id', true));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

create trigger settings_updated_at
  before update on settings
  for each row execute function update_updated_at();

-- Workers (domestic helpers) table
create table if not exists workers (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  nationality text,
  phone text,
  email text,
  start_date date,
  contract_end_date date,
  salary numeric,
  rest_day int check (rest_day between 0 and 6),
  agency_name text,
  passport_no text,
  visa_expiry date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leaves table
create table if not exists leaves (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid references workers(id) on delete cascade not null,
  user_id text not null,
  leave_type text check (leave_type in ('annual', 'sick', 'compensation', 'unpaid', 'other')) default 'annual',
  start_date date not null,
  end_date date not null,
  days int not null default 1,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table workers enable row level security;
alter table leaves enable row level security;

create policy "Users can manage their own workers"
  on workers for all
  using (user_id = current_setting('app.user_id', true));

create policy "Users can manage their own leaves"
  on leaves for all
  using (user_id = current_setting('app.user_id', true));

create trigger workers_updated_at
  before update on workers
  for each row execute function update_updated_at();

create trigger leaves_updated_at
  before update on leaves
  for each row execute function update_updated_at();

-- ── Inventory ─────────────────────────────────────────────────

create table if not exists inventory_categories (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  icon text not null default '📦',
  color text not null default 'bg-gray-100',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists inventory_items (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  category_id uuid references inventory_categories(id) on delete set null,
  name text not null,
  unit text check (unit in ('pcs','pack','bottle','box','bag','kg','g','L','mL','roll')) default 'pcs',
  quantity numeric not null default 0,
  min_quantity numeric not null default 1,
  location text check (location in ('kitchen','bathroom','bedroom','storage','other')) default 'kitchen',
  expiry_date date,
  brand text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table inventory_categories enable row level security;
alter table inventory_items enable row level security;

create policy "Users can manage their own inventory_categories"
  on inventory_categories for all
  using (user_id = current_setting('app.user_id', true));

create policy "Users can manage their own inventory_items"
  on inventory_items for all
  using (user_id = current_setting('app.user_id', true));

create trigger inventory_items_updated_at
  before update on inventory_items
  for each row execute function update_updated_at();

-- Default categories (inserted per-user on first use via API)

-- ── Shopping Lists ────────────────────────────────────────────

create table if not exists shopping_lists (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  status text check (status in ('active','completed')) default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists shopping_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  user_id text not null,
  inventory_item_id uuid references inventory_items(id) on delete set null,
  name text not null,
  quantity numeric not null default 1,
  unit text check (unit in ('pcs','pack','bottle','box','bag','kg','g','L','mL','roll')) default 'pcs',
  is_bought boolean default false,
  estimated_price numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;

create policy "Users can manage their own shopping_lists"
  on shopping_lists for all
  using (user_id = current_setting('app.user_id', true));

create policy "Users can manage their own shopping_items"
  on shopping_items for all
  using (user_id = current_setting('app.user_id', true));

create trigger shopping_lists_updated_at
  before update on shopping_lists
  for each row execute function update_updated_at();

create trigger shopping_items_updated_at
  before update on shopping_items
  for each row execute function update_updated_at();

