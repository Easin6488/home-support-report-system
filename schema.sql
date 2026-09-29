-- Home Support Report Management System
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  employee_id text unique,
  department text default 'Home Support',
  designation text default 'Engineer',
  role text not null default 'engineer' check (role in ('admin','engineer')),
  status text not null default 'active' check (status in ('active','inactive')),
  joining_date date,
  leaving_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  cid text not null unique,
  name text not null,
  mobile text,
  package_name text,
  pop text,
  address text,
  onu_mac text,
  olt_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.profiles(id) on delete cascade,
  report_date date not null,
  resolved integer not null default 0 check (resolved >= 0),
  in_progress integer not null default 0 check (in_progress >= 0),
  waiting integer not null default 0 check (waiting >= 0),
  forward_count integer not null default 0 check (forward_count >= 0),
  in_call integer not null default 0 check (in_call >= 0),
  out_call integer not null default 0 check (out_call >= 0),
  partner_eng_support integer not null default 0 check (partner_eng_support >= 0),
  physical_support integer not null default 0 check (physical_support >= 0),
  total_work integer generated always as (
    resolved + in_progress + waiting + forward_count + in_call + out_call +
    partner_eng_support + physical_support
  ) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(engineer_id, report_date)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  engineer_id uuid references public.profiles(id) on delete set null,
  issue_type text not null,
  description text,
  status text not null default 'Open' check (status in ('Open','In Progress','Waiting','Resolved','Closed')),
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_columns (
  id uuid primary key default gen_random_uuid(),
  column_key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.report_columns(column_key,label,sort_order)
values
('resolved','Resolved',1),
('in_progress','In Progress',2),
('waiting','Waiting',3),
('forward_count','Forward',4),
('in_call','In Call',5),
('out_call','Out Call',6),
('partner_eng_support','Partner / Eng Support',7),
('physical_support','Physical Support',8),
('total_work','Total Work',9)
on conflict(column_key) do nothing;

create index if not exists idx_reports_date on public.daily_reports(report_date);
create index if not exists idx_reports_engineer on public.daily_reports(engineer_id);
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_engineer on public.tickets(engineer_id);
create index if not exists idx_customers_cid on public.customers(cid);

-- Helper: current user's role
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.daily_reports enable row level security;
alter table public.tickets enable row level security;
alter table public.report_columns enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers
for select to authenticated
using (true);

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers
for insert to authenticated
with check (true);

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers
for update to authenticated
using (public.is_admin() or exists(select 1 from public.tickets t where t.customer_id=customers.id and t.engineer_id=auth.uid()))
with check (public.is_admin() or exists(select 1 from public.tickets t where t.customer_id=customers.id and t.engineer_id=auth.uid()));

drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete" on public.customers
for delete to authenticated
using (public.is_admin());

-- Daily reports
drop policy if exists "reports_select" on public.daily_reports;
create policy "reports_select" on public.daily_reports
for select to authenticated
using (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "reports_insert" on public.daily_reports;
create policy "reports_insert" on public.daily_reports
for insert to authenticated
with check (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "reports_update" on public.daily_reports;
create policy "reports_update" on public.daily_reports
for update to authenticated
using (public.is_admin() or engineer_id = auth.uid())
with check (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "reports_delete" on public.daily_reports;
create policy "reports_delete" on public.daily_reports
for delete to authenticated
using (public.is_admin());

-- Tickets
drop policy if exists "tickets_select" on public.tickets;
create policy "tickets_select" on public.tickets
for select to authenticated
using (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "tickets_insert" on public.tickets;
create policy "tickets_insert" on public.tickets
for insert to authenticated
with check (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "tickets_update" on public.tickets;
create policy "tickets_update" on public.tickets
for update to authenticated
using (public.is_admin() or engineer_id = auth.uid())
with check (public.is_admin() or engineer_id = auth.uid());

drop policy if exists "tickets_delete" on public.tickets;
create policy "tickets_delete" on public.tickets
for delete to authenticated
using (public.is_admin());

-- Report columns: everyone can read, admin changes
drop policy if exists "report_columns_select" on public.report_columns;
create policy "report_columns_select" on public.report_columns
for select to authenticated using (true);

drop policy if exists "report_columns_admin" on public.report_columns;
create policy "report_columns_admin" on public.report_columns
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_reports_updated on public.daily_reports;
create trigger trg_reports_updated before update on public.daily_reports
for each row execute function public.set_updated_at();

drop trigger if exists trg_tickets_updated on public.tickets;
create trigger trg_tickets_updated before update on public.tickets
for each row execute function public.set_updated_at();

-- Optional: automatically create a basic profile when a new Auth user signs up.
-- It uses metadata.full_name if supplied.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,full_name,email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- After creating your first Auth user, promote it:
-- update public.profiles set role='admin' where email='YOUR_ADMIN_EMAIL';
