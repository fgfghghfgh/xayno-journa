create table if not exists public.journal_coaching_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists journal_coaching_sessions_updated_at_idx
  on public.journal_coaching_sessions (updated_at desc);

alter table public.journal_coaching_sessions enable row level security;

grant all on table public.journal_coaching_sessions to service_role;
