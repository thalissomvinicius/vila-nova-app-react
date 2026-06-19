-- Setup Supabase para o piloto CQO mobile + dashboard.
-- Execute este arquivo no SQL Editor do Supabase do projeto:
-- https://wcifxyvesmhqurqhnway.supabase.co
--
-- Objetivo:
-- 1. Criar tabelas mobile_* usadas pelo app Android.
-- 2. Permitir insert/select via anon key durante o piloto.
-- 3. Semear os dois formularios CQO que o app baixa.
-- 4. Criar view para auditoria gerencial no dashboard.

create extension if not exists "pgcrypto";

create table if not exists public.mobile_formularios (
  id text primary key,
  area_id text not null,
  titulo text not null,
  descricao text,
  versao integer default 1,
  ativo boolean default true,
  campos_json jsonb not null,
  atualizado_em timestamptz default now()
);

create table if not exists public.mobile_respostas (
  id text primary key,
  formulario_id text not null references public.mobile_formularios(id),
  formulario_versao integer,
  usuario_id text,
  dados_json jsonb not null,
  mapeamento_legado jsonb,
  status text default 'sincronizado',
  dispositivo_id text,
  origem text default 'app_android',
  criado_em timestamptz not null,
  enviado_em timestamptz,
  recebido_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  updated_at timestamptz default now(),
  erro_msg text,
  tentativas integer default 0
);

comment on column public.mobile_respostas.status is
  'Fluxo: pendente_validacao quando chega do app, aprovado ou reprovado depois da auditoria no dashboard.';

create table if not exists public.mobile_gps (
  id text primary key,
  resposta_id text not null references public.mobile_respostas(id) on delete cascade,
  campo_id text not null,
  latitude double precision not null,
  longitude double precision not null,
  precisao double precision,
  altitude double precision,
  capturado_em timestamptz not null,
  recebido_em timestamptz default now()
);

create table if not exists public.mobile_anexos (
  id text primary key,
  resposta_id text not null references public.mobile_respostas(id) on delete cascade,
  campo_id text not null,
  storage_path text not null,
  nome_arquivo text not null,
  tamanho_bytes bigint,
  tipo_mime text,
  criado_em timestamptz not null,
  recebido_em timestamptz default now()
);

create table if not exists public.mobile_assinaturas (
  id text primary key,
  resposta_id text not null references public.mobile_respostas(id) on delete cascade,
  campo_id text not null,
  storage_path text not null,
  criado_em timestamptz not null,
  recebido_em timestamptz default now()
);

create table if not exists public.mobile_sync_logs (
  id uuid primary key default gen_random_uuid(),
  resposta_id text,
  dispositivo_id text,
  status text not null,
  mensagem text,
  criado_em timestamptz default now()
);

create index if not exists idx_mobile_respostas_formulario_data
  on public.mobile_respostas(formulario_id, criado_em desc);

create index if not exists idx_mobile_respostas_usuario_data
  on public.mobile_respostas(usuario_id, criado_em desc);

create index if not exists idx_mobile_respostas_dados_gin
  on public.mobile_respostas using gin(dados_json);

create index if not exists idx_mobile_gps_resposta
  on public.mobile_gps(resposta_id);

insert into public.mobile_formularios (
  id,
  area_id,
  titulo,
  descricao,
  versao,
  ativo,
  campos_json,
  atualizado_em
) values
(
  'form_cqo_corte',
  'campo',
  'CQO Corte',
  'Piloto digital do formulario Corte.',
  7,
  true,
  jsonb_build_array(
    jsonb_build_object('id','nome_polo','tipo','selecao','titulo','Polo','opcoes',jsonb_build_array('Tome-Acu'),'obrigatorio',1,'legado','NomePolo'),
    jsonb_build_object('id','nome_fazenda','tipo','selecao','titulo','Fazenda','opcoes',jsonb_build_array('FE EM DEUS','NOVA CONCEICAO','VILA NOVA'),'obrigatorio',1,'legado','NomeFazenda'),
    jsonb_build_object('id','parcela','tipo','texto','titulo','Parcela','placeholder','Parcela avaliada','obrigatorio',1,'legado','Parcela'),
    jsonb_build_object('id','data_avaliacao','tipo','data','titulo','Data da avaliacao','obrigatorio',1,'legado','DataAvaliacao'),
    jsonb_build_object('id','ciclo_mes','tipo','numero','titulo','Ciclo do mes','placeholder','Ex: 1','obrigatorio',0,'legado','ciclo_mes'),
    jsonb_build_object('id','matricula_avaliador','tipo','texto','titulo','Matricula do avaliador','placeholder','Ex: 2005','obrigatorio',1,'legado','MatriculaAvaliadores'),
    jsonb_build_object('id','matricula_avaliador_2','tipo','texto','titulo','Matricula do avaliador 2','placeholder','Opcional','obrigatorio',0,'legado','MatriculaAvaliador2'),
    jsonb_build_object('id','fiscal_resp','tipo','selecao','titulo','Fiscal responsavel','opcoes',jsonb_build_array('1938 - DANIEL SOUZA COSTA'),'obrigatorio',1,'legado','Fiscal Resp'),
    jsonb_build_object('id','fiscal_resp_equipe','tipo','selecao','titulo','Fiscal responsavel da equipe','opcoes',jsonb_build_array('2833 - ANTONIO BARBOSA FERREIRA','1790 - DANILSON OLIVEIRA MOREIRA','2950 - FRANCISCO DAS CHAGAS PEREIRA SANTOS','2844 - JOAO GABRIEL PEREIRA BEZERRA','384 - RAIMUNDO NONATO DOS SANTOS FURTADO JUNIOR','2146 - RENEY NERES DA COSTA','2084 - RONALD DA SILVA PONTES','1155 - VALDINEI GOMES SANCHES','2179 - JOAO BATISTA SANTOS DE OLIVEIRA','2487 - ANTONIO CARLOS PEREIRA SOARES','2798 - MAISES ALBUQUERQUE DE ANDRADE','2963 - VALCIONE DA CONCEICAO'),'obrigatorio',1,'legado','Fiscal Resp Equipe'),
    jsonb_build_object('id','linhas_corte','tipo','linhas_cqo_corte','titulo','Linhas de avaliacao do corte','obrigatorio',1,'legado','linhas_raw'),
    jsonb_build_object('id','observacao','tipo','observacao','titulo','Observacao geral','placeholder','Registre observacoes.','obrigatorio',0,'legado','Observacao'),
    jsonb_build_object('id','gps_cqo_corte','tipo','gps','titulo','Localizacao GPS','obrigatorio',0),
    jsonb_build_object('id','foto_evidencia_corte','tipo','foto','titulo','Imagem geolocalizada da coleta','obrigatorio',0),
    jsonb_build_object('id','acompanhamento','tipo','acompanhamento','titulo','Acompanhamento','obrigatorio',0)
  ),
  now()
),
(
  'form_cqo_carreamento_fruto_solto',
  'campo',
  'CQO Carreamento e Fruto Solto',
  'Piloto digital do controle unico de Carreamento e Fruto Solto.',
  8,
  true,
  jsonb_build_array(
    jsonb_build_object('id','nome_polo','tipo','selecao','titulo','Polo','opcoes',jsonb_build_array('Tome-Acu'),'obrigatorio',1,'legado','NomePolo'),
    jsonb_build_object('id','nome_fazenda','tipo','selecao','titulo','Fazenda','opcoes',jsonb_build_array('FE EM DEUS','NOVA CONCEICAO','VILA NOVA'),'obrigatorio',1,'legado','NomeFazenda'),
    jsonb_build_object('id','parcela','tipo','texto','titulo','Parcela','placeholder','Parcela avaliada','obrigatorio',1,'legado','Parcela'),
    jsonb_build_object('id','ano_plantio','tipo','numero','titulo','Ano do plantio','placeholder','Ex: 2013','obrigatorio',0),
    jsonb_build_object('id','densidade','tipo','numero','titulo','Densidade','placeholder','Ex: 160','obrigatorio',0),
    jsonb_build_object('id','total_plantas_parcela','tipo','numero','titulo','Total de plantas da parcela','placeholder','Ex: 5067','obrigatorio',0),
    jsonb_build_object('id','total_cachos_carreados','tipo','numero','titulo','Total de cachos carreados','placeholder','Ex: 120','obrigatorio',0),
    jsonb_build_object('id','variedade','tipo','texto','titulo','Variedade','placeholder','Ex: cultivar/variedade','obrigatorio',0),
    jsonb_build_object('id','data_avaliacao','tipo','data','titulo','Data da avaliacao','obrigatorio',1,'legado','DataAvaliacao'),
    jsonb_build_object('id','ciclo_mes','tipo','numero','titulo','Ciclo do mes','placeholder','Ex: 1','obrigatorio',0,'legado','Ciclo_mes'),
    jsonb_build_object('id','matricula_avaliador','tipo','texto','titulo','Matricula do avaliador','placeholder','Ex: 2005','obrigatorio',1,'legado','MatriculaAvaliadores'),
    jsonb_build_object('id','matricula_avaliador_2','tipo','texto','titulo','Matricula do avaliador 2','placeholder','Opcional','obrigatorio',0,'legado','MatriculaAvaliador2'),
    jsonb_build_object('id','fiscal_resp','tipo','selecao','titulo','Fiscal responsavel','opcoes',jsonb_build_array('1938 - DANIEL SOUZA COSTA'),'obrigatorio',1,'legado','Fiscal Resp'),
    jsonb_build_object('id','fiscal_resp_equipe','tipo','selecao','titulo','Fiscal responsavel da equipe','opcoes',jsonb_build_array('2833 - ANTONIO BARBOSA FERREIRA','1790 - DANILSON OLIVEIRA MOREIRA','2950 - FRANCISCO DAS CHAGAS PEREIRA SANTOS','2844 - JOAO GABRIEL PEREIRA BEZERRA','384 - RAIMUNDO NONATO DOS SANTOS FURTADO JUNIOR','2146 - RENEY NERES DA COSTA','2084 - RONALD DA SILVA PONTES','1155 - VALDINEI GOMES SANCHES','2179 - JOAO BATISTA SANTOS DE OLIVEIRA','2487 - ANTONIO CARLOS PEREIRA SOARES','2798 - MAISES ALBUQUERQUE DE ANDRADE','2963 - VALCIONE DA CONCEICAO'),'obrigatorio',1,'legado','Fiscal Resp Equipe'),
    jsonb_build_object('id','linhas_carreamento','tipo','linhas_cqo_carreamento','titulo','Linhas de avaliacao do carreamento','obrigatorio',1,'legado','linhas_raw'),
    jsonb_build_object('id','observacao','tipo','observacao','titulo','Observacao geral','placeholder','Registre observacoes.','obrigatorio',0),
    jsonb_build_object('id','gps_cqo_carreamento','tipo','gps','titulo','Localizacao GPS','obrigatorio',0),
    jsonb_build_object('id','foto_evidencia_carreamento','tipo','foto','titulo','Imagem geolocalizada da coleta','obrigatorio',0),
    jsonb_build_object('id','acompanhamento','tipo','acompanhamento','titulo','Acompanhamento','obrigatorio',0)
  ),
  now()
)
on conflict (id) do update set
  area_id = excluded.area_id,
  titulo = excluded.titulo,
  descricao = excluded.descricao,
  versao = excluded.versao,
  ativo = excluded.ativo,
  campos_json = excluded.campos_json,
  atualizado_em = now();

create or replace view public.vw_mobile_cqo_coletas as
select
  r.id as resposta_id,
  r.formulario_id,
  r.formulario_versao,
  r.usuario_id,
  r.status,
  r.origem,
  r.criado_em,
  r.enviado_em,
  r.recebido_em,
  r.dados_json ->> 'nome_polo' as polo,
  r.dados_json ->> 'nome_fazenda' as fazenda,
  r.dados_json ->> 'parcela' as parcela,
  r.dados_json ->> 'data_avaliacao' as data_avaliacao,
  r.dados_json ->> 'matricula_avaliador' as matricula_avaliador,
  r.dados_json ->> 'matricula_avaliador_2' as matricula_avaliador_2,
  r.dados_json ->> 'fiscal_resp' as fiscal_resp,
  r.dados_json ->> 'fiscal_resp_equipe' as fiscal_resp_equipe,
  r.dados_json
from public.mobile_respostas r
where r.formulario_id in (
  'form_cqo_corte',
  'form_cqo_carreamento_fruto_solto'
);

alter table public.mobile_formularios enable row level security;
alter table public.mobile_respostas enable row level security;
alter table public.mobile_gps enable row level security;
alter table public.mobile_anexos enable row level security;
alter table public.mobile_assinaturas enable row level security;
alter table public.mobile_sync_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.mobile_formularios to anon, authenticated;
grant select, insert, update on public.mobile_respostas to anon, authenticated;
grant select, insert on public.mobile_sync_logs to anon, authenticated;
grant select, insert on public.mobile_gps to anon, authenticated;
grant select, insert on public.mobile_anexos to anon, authenticated;
grant select, insert on public.mobile_assinaturas to anon, authenticated;

drop policy if exists "pilot read mobile_formularios" on public.mobile_formularios;
create policy "pilot read mobile_formularios"
on public.mobile_formularios for select
to anon, authenticated
using (true);

drop policy if exists "pilot read mobile_respostas" on public.mobile_respostas;
create policy "pilot read mobile_respostas"
on public.mobile_respostas for select
to anon, authenticated
using (true);

drop policy if exists "pilot insert mobile_respostas" on public.mobile_respostas;
create policy "pilot insert mobile_respostas"
on public.mobile_respostas for insert
to anon, authenticated
with check (true);

drop policy if exists "pilot update mobile_respostas" on public.mobile_respostas;
create policy "pilot update mobile_respostas"
on public.mobile_respostas for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "pilot read mobile_sync_logs" on public.mobile_sync_logs;
create policy "pilot read mobile_sync_logs"
on public.mobile_sync_logs for select
to anon, authenticated
using (true);

drop policy if exists "pilot insert mobile_sync_logs" on public.mobile_sync_logs;
create policy "pilot insert mobile_sync_logs"
on public.mobile_sync_logs for insert
to anon, authenticated
with check (true);
