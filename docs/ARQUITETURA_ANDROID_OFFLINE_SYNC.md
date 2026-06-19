# Arquitetura Android Offline-First

Este app deve ser tratado como a base oficial para compilar Android. O prototipo em `../prototipo-mobile-web` serve como referencia visual e funcional, mas a implementacao mobile fica neste projeto Expo.

## Objetivo

Coletar dados no campo mesmo sem internet, armazenar tudo localmente em SQLite no Android e sincronizar depois com Supabase. O dashboard deve ler os dados ja sincronizados no Supabase.

## Fluxo Principal

1. Colaborador faz login.
2. App baixa ou usa formularios salvos localmente.
3. Colaborador preenche uma coleta.
4. App grava a coleta em SQLite com status `pendente`.
5. App grava anexos, assinatura e GPS em tabelas locais.
6. App cria item em `sync_queue`.
7. Quando houver internet, a fila envia os registros ao Supabase.
8. Ao confirmar envio, o app marca `respostas.status = sincronizado`.
9. Dashboard consulta Supabase, nunca o SQLite do aparelho.

## Fonte de Verdade Local

SQLite Android:

- `usuarios`: sessao e perfil local do colaborador.
- `areas`: areas operacionais.
- `formularios`: catalogo local dos formularios e versoes.
- `respostas`: coleta principal, com `dados_json`.
- `gps`: pontos capturados por campo/ocorrencia.
- `anexos`: fotos ou arquivos locais.
- `assinaturas`: assinaturas locais.
- `sync_queue`: fila de envio.
- `logs`: log operacional local.
- `sync_runs`: auditoria de execucoes de sincronizacao.
- `app_meta`: versao local de schema e metadados.

## Regra de Modelagem

Manter `respostas.dados_json` como payload bruto completo da coleta. Para consultas do dashboard, o Supabase deve criar tabelas/views analiticas, por exemplo:

- `vw_cqo_corte_linhas`
- `vw_cqo_carreamento_linhas`
- `vw_coletas_gps`
- `vw_sync_status`

Assim o app continua flexivel para novos formularios, e o dashboard recebe dados prontos para analise.

## CQO Corte

Formulario: `form_cqo_corte`

Campos principais:

- identificacao: polo, fazenda, parcela, data, ciclo;
- responsaveis: avaliador, fiscal, empresa/equipe quando aplicavel;
- linhas: `linhas_cqo_corte`;
- acompanhamento;
- GPS;
- observacao;
- assinatura.

## CQO Carreamento

Formulario: `form_cqo_carreamento_fruto_solto`

Campos principais:

- identificacao: polo, fazenda, parcela, data, ano plantio, densidade, variedade;
- linhas: `linhas_cqo_carreamento`;
- campos por linha: linha, plantas da linha, cachos mal posicionados, cachos nao carreados, plantas observadas, peso dos frutos;
- acompanhamento;
- GPS;
- observacao;
- assinatura.

## Sincronizacao

Cada envio deve ser idempotente pelo `resposta_id`. Se o app reenviar o mesmo registro, Supabase deve atualizar/ignorar sem duplicar.

Payload minimo enviado:

```json
{
  "resposta_id": "res_...",
  "formulario_id": "form_cqo_corte",
  "formulario_versao": 2,
  "usuario_id": "user_...",
  "dados": {},
  "mapeamento_legado": {},
  "criado_em": "2026-06-09T12:00:00.000Z"
}
```

## Estados de Sync

- `pendente`: salvo local, ainda nao enviado.
- `enviando`: tentativa em andamento.
- `sincronizado`: confirmado pelo servidor.
- `erro`: falhou e deve tentar de novo.

## Decisao Tecnica

Para Android, manter Expo + `expo-sqlite`. O SQLite local e obrigatorio porque a operacao de campo precisa funcionar offline. Supabase fica como banco central e fonte para dashboard.

