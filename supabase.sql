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