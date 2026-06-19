-- Staging para importacao local do arquivo CQO:
-- E:\TECNICA\Qualidade Agricola\1_Digitacao_CQO.xlsx
--
-- Execute no SQL Editor do Supabase antes de rodar o importador local.
-- O importador envia somente as abas corte e carreamento.

create table if not exists public.cqo_import_snapshots (
  import_key text primary key,
  fonte text not null,
  source_file text not null,
  source_path text not null,
  file_last_write_time timestamptz,
  corte_total_rows integer not null default 0,
  carreamento_total_rows integer not null default 0,
  corte_columns_json jsonb not null default '[]'::jsonb,
  carreamento_columns_json jsonb not null default '[]'::jsonb,
  corte_rows_json jsonb not null default '[]'::jsonb,
  carreamento_rows_json jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cqo_import_snapshots_updated
  on public.cqo_import_snapshots(updated_at desc);

comment on table public.cqo_import_snapshots is
  'Snapshot bruto normalizado do Excel 1_Digitacao_CQO. Dashboard deve destrinchar corte_rows_json e carreamento_rows_json.';

comment on column public.cqo_import_snapshots.corte_rows_json is
  'Linhas da aba corte. Inclui parcela_original e parcela_normalizada; exemplo F10.1 vira F-10.';

comment on column public.cqo_import_snapshots.carreamento_rows_json is
  'Linhas da aba carreamento. Inclui parcela_original e parcela_normalizada; exemplo F10.1 vira F-10.';

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.cqo_import_snapshots to anon, authenticated;

alter table public.cqo_import_snapshots enable row level security;

drop policy if exists "cqo_import_snapshots_select" on public.cqo_import_snapshots;
create policy "cqo_import_snapshots_select"
  on public.cqo_import_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cqo_import_snapshots_insert" on public.cqo_import_snapshots;
create policy "cqo_import_snapshots_insert"
  on public.cqo_import_snapshots
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cqo_import_snapshots_update" on public.cqo_import_snapshots;
create policy "cqo_import_snapshots_update"
  on public.cqo_import_snapshots
  for update
  to anon, authenticated
  using (true)
  with check (true);
