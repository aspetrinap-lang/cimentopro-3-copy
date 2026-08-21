-- CimentoPro SaaS foundation
-- Safe migration draft: this file is intentionally NOT executed by the app yet.
-- It introduces the tenant/security model without changing Base44 entities.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cnpj text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  status text not null default 'trial' check (status in ('trial','active','suspended','cancelled')),
  plan_id text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_cnpj_unique
  on public.companies (cnpj)
  where cnpj is not null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  module text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  unique (role_id, module)
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists company_users_user_idx on public.company_users(user_id);
create index if not exists company_users_company_idx on public.company_users(company_id);
create index if not exists roles_company_idx on public.roles(company_id);

-- Security helpers. SECURITY DEFINER avoids recursive RLS checks.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and active = true
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1 from public.company_users
      where company_id = target_company_id
        and user_id = auth.uid()
        and active = true
    );
$$;

create or replace function public.has_company_role(target_company_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.company_users cu
      join public.roles r on r.id = cu.role_id
      where cu.company_id = target_company_id
        and cu.user_id = auth.uid()
        and cu.active = true
        and r.active = true
        and lower(r.name) = lower(target_role)
    );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.company_users enable row level security;
alter table public.platform_admins enable row level security;

-- Companies: members see their company; platform admins see all.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (public.is_company_member(id));

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert with check (public.is_platform_admin() or auth.uid() is not null);

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update using (public.is_platform_admin() or public.has_company_role(id, 'administrador'))
  with check (public.is_platform_admin() or public.has_company_role(id, 'administrador'));

-- Profiles: users can manage their own profile; platform admins can manage all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- Company users: membership is visible only inside the tenant; platform admins see all.
drop policy if exists company_users_select on public.company_users;
create policy company_users_select on public.company_users
  for select using (public.is_company_member(company_id));

drop policy if exists company_users_insert on public.company_users;
create policy company_users_insert on public.company_users
  for insert with check (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'));

drop policy if exists company_users_update on public.company_users;
create policy company_users_update on public.company_users
  for update using (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'))
  with check (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'));

drop policy if exists company_users_delete on public.company_users;
create policy company_users_delete on public.company_users
  for delete using (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'));

-- Roles and permissions are tenant-scoped.
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select using (public.is_company_member(company_id));

drop policy if exists roles_manage on public.roles;
create policy roles_manage on public.roles
  for all using (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'))
  with check (public.is_platform_admin() or public.has_company_role(company_id, 'administrador'));

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = permissions.role_id
        and public.is_company_member(r.company_id)
    )
  );

drop policy if exists permissions_manage on public.permissions;
create policy permissions_manage on public.permissions
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = permissions.role_id
        and public.has_company_role(r.company_id, 'administrador')
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = permissions.role_id
        and public.has_company_role(r.company_id, 'administrador')
    )
  );

-- Platform admins are deliberately isolated from ordinary company users.
drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins
  for select using (user_id = auth.uid() or public.is_platform_admin());

-- Default role/permission blueprint. Actual company-specific roles are seeded when a company is created.
-- Modules mirror the existing CimentoPro permission model.
-- dashboard, orders, history, analysis, stats, costs, pricing, executive_summary,
-- virtual_engineer, machines, lines, molds, maintenance, quality, cadastro, configuracoes, backup.
