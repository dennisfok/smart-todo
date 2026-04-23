-- Smart Todo App - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Projects table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  color text default '#6366f1',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null,
  description text,
  importance text check (importance in ('asap', 'high', 'medium', 'low')) default 'medium',
  status text check (status in ('not_started', 'in_progress', 'completed')) default 'not_started',
  duration_minutes int default 60,
  start_time timestamptz,
  end_time timestamptz,
  deadline timestamptz,
  is_fixed boolean default false,
  is_completed boolean default false,
  project_id uuid references projects(id) on delete set null,
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
alter table projects enable row level security;
alter table tasks enable row level security;
alter table settings enable row level security;

-- Policies: users can only see/edit their own data
create policy "Users can manage their own projects"
  on projects for all
  using (user_id = current_setting('app.user_id', true));

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

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

create trigger settings_updated_at
  before update on settings
  for each row execute function update_updated_at();

-- Migration: add new columns to existing tasks table if upgrading
-- alter table tasks add column if not exists status text check (status in ('not_started', 'in_progress', 'completed')) default 'not_started';
-- alter table tasks add column if not exists duration_minutes int default 60;
-- alter table tasks add column if not exists deadline timestamptz;
-- alter table tasks add column if not exists project_id uuid references projects(id) on delete set null;
-- alter table tasks alter column importance type text;
-- update tasks set importance = 'high' where importance = 'high';
