create extension if not exists pgcrypto;

create table if not exists public.app_users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null unique,
    role text not null default 'Planner' check (role in ('Planner', 'Administrator')),
    password_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create table if not exists public.analyses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.app_users(id) on delete cascade,
    area_km2 numeric(12, 2),
    period_years integer,
    period_value text,
    analysis_params jsonb not null default '{}'::jsonb,
    area_shape jsonb,
    vegetation_change_percent numeric(12, 2),
    urban_change_percent numeric(12, 2),
    water_change_percent numeric(12, 2),
    uss_score numeric(12, 2),
    uss_label text,
    uss_interpretation text,
    uss_weights jsonb,
    temperature_proxy_percent numeric(12, 2),
    status text not null default 'completed',
    report_state jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

create table if not exists public.authority_alerts (
    id uuid primary key default gen_random_uuid(),
    analysis_id uuid references public.analyses(id) on delete cascade,
    recipient_email text not null,
    trigger_reasons jsonb not null default '[]'::jsonb,
    delivery_status text not null check (delivery_status in ('sent', 'failed', 'skipped', 'pending')),
    smtp_response text,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_authority_alerts_analysis_id on public.authority_alerts(analysis_id);
create index if not exists idx_authority_alerts_created_at on public.authority_alerts(created_at desc);