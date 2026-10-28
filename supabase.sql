create table if not exists public.journal_trades (
  id text primary key,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);

alter table public.journal_trades enable row level security;

revoke all on public.journal_trades from anon, authenticated;
grant all on public.journal_trades to service_role;