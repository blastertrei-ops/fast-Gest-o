-- Fast Gestão: schema de migração paralela do Firestore para Supabase.
-- As IDs existentes são textos (por exemplo, emp_ e del_), portanto não use UUID aqui.
-- A coluna payload preserva campos ainda não normalizados durante a transição.

create schema if not exists app_private;

create or replace function app_private.jwt_company_id() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'companyId', '');
$$;

create or replace function app_private.jwt_is_master() returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'master';
$$;

create or replace function app_private.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table if not exists public.companies (id text primary key, name text, status text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.users (id text primary key, company_id text references public.companies(id) on delete restrict, email text, role text, driver_id text, active boolean, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.drivers (id text primary key, company_id text not null references public.companies(id) on delete restrict, user_id text, name text, active boolean, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.vehicles (id text primary key, company_id text not null references public.companies(id) on delete restrict, driver_id text, plate text, active boolean, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.clients (id text primary key, company_id text not null references public.companies(id) on delete restrict, name text, document text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.deliveries (id text primary key, company_id text not null references public.companies(id) on delete restrict, client_id text, driver_id text, status text, scheduled_at timestamptz, delivered_at timestamptz, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.driver_locations (id text primary key, company_id text not null references public.companies(id) on delete restrict, driver_id text not null, latitude double precision, longitude double precision, updated_location_at timestamptz, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.route_histories (id text primary key, company_id text not null references public.companies(id) on delete restrict, delivery_id text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.notifications (id text primary key, company_id text not null references public.companies(id) on delete restrict, delivery_id text, notification_type text, created_notification_at timestamptz, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.audit_logs (id text primary key, company_id text not null references public.companies(id) on delete restrict, action_type text, actor_id text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.master_audit_logs (id text primary key, action_type text, actor_id text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.custom_roles (id text primary key, company_id text, name text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));

create index if not exists users_company_id_idx on public.users(company_id);
create unique index if not exists users_company_email_idx on public.users(company_id, lower(email)) where email is not null;
create index if not exists drivers_company_id_idx on public.drivers(company_id);
create index if not exists vehicles_company_id_idx on public.vehicles(company_id);
create index if not exists clients_company_id_idx on public.clients(company_id);
create index if not exists deliveries_company_status_idx on public.deliveries(company_id, status);
create index if not exists deliveries_company_driver_idx on public.deliveries(company_id, driver_id);
create index if not exists locations_company_driver_idx on public.driver_locations(company_id, driver_id);
create index if not exists routes_company_delivery_idx on public.route_histories(company_id, delivery_id);
create index if not exists notifications_company_created_idx on public.notifications(company_id, created_notification_at desc);
create index if not exists audit_logs_company_created_idx on public.audit_logs(company_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['companies', 'users', 'drivers', 'vehicles', 'clients', 'deliveries', 'driver_locations', 'route_histories', 'notifications', 'audit_logs', 'master_audit_logs', 'custom_roles'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()', table_name || '_set_updated_at', table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Browser access is denied by default. These read policies only work for a future
-- Supabase-issued JWT with companyId; the current app stays API/server-only.
create policy "company members can read their rows" on public.users for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read drivers" on public.drivers for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read vehicles" on public.vehicles for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read clients" on public.clients for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read deliveries" on public.deliveries for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read locations" on public.driver_locations for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read routes" on public.route_histories for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read notifications" on public.notifications for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "company members can read audit logs" on public.audit_logs for select to authenticated using (app_private.jwt_is_master() or company_id = app_private.jwt_company_id());
create policy "masters can read company directory" on public.companies for select to authenticated using (app_private.jwt_is_master());
create policy "masters can read master audit logs" on public.master_audit_logs for select to authenticated using (app_private.jwt_is_master());
create policy "company members can read roles" on public.custom_roles for select to authenticated using (app_private.jwt_is_master() or company_id is null or company_id = app_private.jwt_company_id());
