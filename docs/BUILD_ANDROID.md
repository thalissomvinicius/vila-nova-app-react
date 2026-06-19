# Build Android

Projeto oficial para compilacao: `vilanova-agro-app-react`.

## Variaveis de Ambiente

Defina antes do build:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://SEU-PROJETO.supabase.co/rest/v1"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLICA"
```

Nao grave chaves reais no repositorio.

## Rodar em Desenvolvimento

```powershell
cd C:\Users\thalissom.cruz\Documents\Codex\FormsOnline\vilanova-agro-app-react
npm install
npm start
```

## Gerar APK de Teste

```powershell
npm run build:android:apk
```

Perfil usado: `preview` em `eas.json`.

## Gerar AAB de Producao

```powershell
npm run build:android:aab
```

Perfil usado: `production` em `eas.json`.

## Checklist Antes do Build

- `node --check core/api.js`
- `node --check core/config.js`
- `node --check core/database.js`
- `node --check core/syncStore.js`
- `npx expo-doctor`
- conferir `app.json > expo.android.package`
- conferir permissoes de camera/localizacao
- testar login offline
- salvar coleta offline
- conferir item em fila de sync
- testar sync simulada
- testar sync real contra Supabase homologacao

## Decisao de Build

- APK: distribuicao interna rapida para teste em aparelhos Android.
- AAB: publicacao formal na Google Play.

