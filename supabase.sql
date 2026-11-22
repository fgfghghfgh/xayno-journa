create table if not exists public.journal_trades (
  id text primary key,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);

alter table public.journal_trades enable row level security;

revoke all on public.journal_trades from anon, authenticated;
grant all on public.journal_trades to service_role;

create table if not exists public.journal_push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.journal_push_subscriptions enable row level security;
revoke all on public.journal_push_subscriptions from anon, authenticated;
grant all on public.journal_push_subscriptions to service_role;

create table if not exists public.journal_checkins (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_personal_rules (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_assignments (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_contracts (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_lesson_library (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_memories (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_monthly_summaries (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_coaching_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.journal_chat_history (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'journal_checkins',
    'journal_personal_rules',
    'journal_assignments',
    'journal_contracts',
    'journal_lesson_library',
    'journal_memories',
    'journal_monthly_summaries',
    'journal_coaching_sessions',
    'journal_chat_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format('create index if not exists %I_updated_at_idx on public.%I (updated_at desc)', table_name, table_name);
  end loop;
end $$;