# Vila Nova Coletas - App Android

Aplicativo mobile de coleta agricola da Vila Nova Agroindustrial.

Este projeto Expo/React Native e a base oficial para evoluir o prototipo e gerar a versao Android. O app segue arquitetura offline-first: salva coletas em SQLite local no aparelho e sincroniza depois com Supabase.

## Estrutura

```text
app/                  Telas e rotas Expo Router
components/           Campos reutilizaveis dos formularios
core/                 SQLite, API, autenticacao, sync e configuracoes
assets/               Logo, icones e splash
docs/                 Arquitetura, schema Supabase e build Android
```

## Banco Local Android

Arquivo principal: `core/database.js`.

Tabelas locais:

- `usuarios`
- `areas`
- `formularios`
- `respostas`
- `gps`
- `anexos`
- `assinaturas`
- `sync_queue`
- `sync_runs`
- `logs`
- `app_meta`

## Sincronizacao

Arquivo principal: `core/syncStore.js`.

O app grava tudo offline e cria registros em `sync_queue`. Quando houver internet, a fila envia os dados ao endpoint configurado em `core/config.js`.

Para Supabase, use:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://SEU-PROJETO.supabase.co/rest/v1"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLICA"
```

## Documentos Tecnicos

- `docs/ARQUITETURA_ANDROID_OFFLINE_SYNC.md`
- `docs/SUPABASE_SCHEMA.sql`
- `docs/BUILD_ANDROID.md`

## Desenvolvimento

```powershell
cd C:\Users\thalissom.cruz\Documents\Codex\FormsOnline\vilanova-agro-app-react
npm install
npm start
```

## Build Android

APK interno:

```powershell
npm run build:android:apk
```

AAB producao:

```powershell
npm run build:android:aab
```

