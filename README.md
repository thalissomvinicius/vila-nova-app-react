# Vila Nova Agroindustrial — App Android React Native (Expo)

Aplicativo móvel de coleta de dados de campo da **Vila Nova Agroindustrial**, desenvolvido com **React Native** e **Expo SDK 51**. Unificado tecnologicamente com o **Web Dashboard**, utiliza o **Zustand** para controle de estados reativos e **expo-sqlite** para armazenamento offline-first de alto desempenho.

---

## 🚀 Diferencial desta Versão (Expo Go)

Diferente do projeto em Flutter, esta versão em React Native é **extremamente fácil de programar, compilar e testar**:
* **Sem Complicação**: Você **NÃO precisa instalar o Android Studio ou Java JDK** local na sua máquina Windows para ver o app funcionando.
* **Teste Instantâneo**: Ao iniciar o projeto no terminal, um **QR Code** será exibido. Baixe o aplicativo **Expo Go** na Google Play Store, leia o QR Code com a câmera do seu celular, e o aplicativo abrirá instantaneamente na tela do seu aparelho físico!

---

## 🎨 Tecnologia e Arquitetura

O aplicativo possui uma estrutura moderna e limpa:
1. **Zustand Stores**:
   * `core/authStore.js`: Controle de sessão de operador com suporte a login híbrido (online + fallback offline para demonstrações locais).
   * `core/syncStore.js`: Engine reativo para filas de uploads de coletas e console de logs em tempo real.
2. **SQLite Database (`core/database.js`)**:
   * Gerenciamento com a biblioteca oficial `expo-sqlite` (Expo 51).
   * Estrutura relacional com 10 tabelas operacionais.
   * Auto-seeding: Criação automática de tabelas e preenchimento de dados de teste (áreas operacionais e formulários mockados) na primeira inicialização.
3. **Expo Router (`app/`)**:
   * Sistema de rotas dinâmico baseado em arquivos, idêntico ao framework Next.js.
   * Rota raiz `_layout.js` operando com guards de autenticação que redirecionam o usuário automaticamente.
4. **12 Componentes Customizados (`components/`)**:
   * Todos os 12 tipos de campos desenhados a mão com Material Design 3 e máscaras otimizadas (Moeda BRL, máscara de Data/Hora inteligentes com botões de auto-preenchimento rápido, assinaturas com Canvas e localização via antenas de GPS nativas).

---

## 📂 Diretórios do Projeto

```
vilanova-agro-app-react/
├── package.json                        # Gerenciamento de pacotes NPM
├── app.json                            # Arquivo de Manifesto do Expo (permissões de Hardware)
├── babel.config.js                     # Configurações de pré-processamento
├── README.md                           # Instruções do projeto
├── core/
│   ├── colors.js                       # Definições visuais corporativas
│   ├── database.js                     # Conexão SQLite e sementes iniciais
│   ├── secureStore.js                  # Armazenamento criptografado de tokens
│   ├── api.js                          # Cliente de rede Axios (JWT Auto-inject)
│   ├── authStore.js                    # Estado Zustand de Autenticação
│   └── syncStore.js                    # Estado Zustand de Sincronização
├── components/                         # Os 12 Widgets de campos operacionais
│   ├── CampoTexto.js, CampoNumero.js, CampoMoeda.js, CampoData.js, CampoHora.js
│   ├── CampoSelecao.js, CampoCheckbox.js, CampoRadio.js, CampoObservacao.js
│   └── CampoFoto.js, CampoGps.js, CampoAssinatura.js
└── app/                                # Rotas de telas do Expo Router
    ├── _layout.js                      # Inicialização, Guards e Stack principal
    ├── index.js                        # Rota de pouso e redirecionamento
    ├── login.js                        # Tela de login corporativa premium
    ├── home.js                         # Tela principal (Grid de áreas operacionais)
    ├── sync.js                         # Central de Sincronização e terminal de logs
    ├── historico.js                    # Histórico detalhado de coletas (Pendentes/Sincronizados)
    └── formularios/
        └── [areaId].js                 # Lista de formulários filtrados por área
    └── preencher/
        └── [formId].js                 # Preenchimento dinâmico e gravações SQLite
```

---

## ⚙️ Passo a Passo para Instalar e Executar

Siga estas instruções simples para rodar o app no seu computador:

### 1. Preparação
1. Certifique-se de que possui o **Node.js** instalado na sua máquina Windows.
2. No seu celular físico Android ou iOS, instale o aplicativo **Expo Go** através da Google Play Store ou App Store.

### 2. Instalar as Dependências
Abra o terminal no diretório do projeto móvel e rode o comando:
```bash
cd C:\Users\thalissom.cruz\.gemini\antigravity\scratch\vilanova-agro-app-react
npm install
```

### 3. Executar o Servidor de Desenvolvimento
Inicie o servidor local do Expo executando:
```bash
npm start
```
> O Expo abrirá um menu no terminal e exibirá um **QR Code grande**.

### 4. Testar no Celular
1. Abra o aplicativo **Expo Go** no seu celular.
2. Certifique-se de que o celular está conectado na **mesma rede Wi-Fi** que o seu computador.
3. Clique em "Scan QR Code" no Expo Go e aponte a câmera para o terminal do computador.
4. O app será baixado e executado imediatamente na tela do seu aparelho!

---

## 🧪 Como Testar o Fluxo Offline-First no App

1. **Login**: Digite `Thalissom Cruz` no campo de usuário e qualquer senha. O app identificará que você está offline/local, criará um perfil local com o cargo **Assistente Administrativo** e liberará o acesso.
2. **Dashboard**: Observe o banner informando `0 registros pendentes`.
3. **Preencher Ficha**:
   * Clique em **Campo** e depois selecione **Relatório de Inspeção Diária**.
   * Digite o talhão, insira valores, use os botões rápidos **Hoje** e **Agora**, capture coordenadas GPS clicando em **Capturar** e desenhe sua assinatura no canvas, salvando-a.
   * Toque em **Salvar Coleta**.
4. **Fila de Sync & Logs**:
   * O banner da tela inicial atualizará instantaneamente indicando `1 registro pendente`.
   * Clique no botão **Sincronização** (ícone de nuvem) no canto superior direito.
   * Toque em **Simular Envio** e observe a barra de progresso rodando e os logs monospaçados descendo no console verde e preto em tempo real!
   * Ao finalizar, o banner inicial voltará para `0 registros pendentes` e sua coleta será movida de *Pendentes* para *Sincronizados* no seu **Histórico de Coletas**.
