-- Staging para importacoes locais de arquivos de headcount.
-- Execute no SQL Editor do Supabase antes de rodar o importador local.

create table if not exists public.headcount_import_snapshots (
  import_key text primary key,
  fonte text not null,
  reference_month text not null,
  source_file text not null,
  source_path text not null,
  source_sheet text not null,
  file_last_write_time timestamptz,
  total_rows integer not null default 0,
  columns_json jsonb not null default '[]'::jsonb,
  rows_json jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_headcount_import_snapshots_fonte_month
  on public.headcount_import_snapshots(fonte, reference_month desc);

comment on table public.headcount_import_snapshots is
  'Snapshots brutos enviados por importadores locais. Views/funcoes no Supabase devem destrinchar rows_json.';

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.headcount_import_snapshots to anon, authenticated;

-- Se RLS estiver habilitado manualmente nessa tabela, mantenha estas politicas.
alter table public.headcount_import_snapshots enable row level security;

drop policy if exists "headcount_import_snapshots_select" on public.headcount_import_snapshots;
create policy "headcount_import_snapshots_select"
  on public.headcount_import_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "headcount_import_snapshots_insert" on public.headcount_import_snapshots;
create policy "headcount_import_snapshots_insert"
  on public.headcount_import_snapshots
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "headcount_import_snapshots_update" on public.headcount_import_snapshots;
create policy "headcount_import_snapshots_update"
  on public.headcount_import_snapshots
  for update
  to anon, authenticated
  using (true)
  with check (true);
