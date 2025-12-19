# Margea


<a href="https://hosted.weblate.org/engage/margea/">
<img src="https://hosted.weblate.org/widget/margea/multi-auto.svg" alt="Status da tradução" />
</a>

[[English](README_en.md)] [[Español](README_es.md)] [[Português](README.md)]

Analisador de Pull Requests do GitHub com foco em PRs automatizados do Renovate Bot.

## 📋 Visão Geral

Margea é um webapp totalmente frontend (sem backend) que permite analisar, agrupar e visualizar Pull Requests do GitHub, especialmente aqueles criados pelo Renovate Bot. O app roda 100% no navegador e usa a GitHub GraphQL API v4 diretamente.

## ✨ Funcionalidades

- 🔐 **OAuth com GitHub**: Login seguro com GitHub (sem necessidade de gerar tokens manualmente)
- 🔍 **Busca configurável**: Busque PRs por autor, organização ou repositório
- 📊 **Agrupamento inteligente**: PRs agrupados por pacote, branch base e labels
- 📈 **Estatísticas**: Visualize totais, status e métricas dos PRs
- 🎨 **Filtros**: Filtre por repositório e status (open, merged, closed)
- 🌓 **Dark mode**: Alterne entre temas claro e escuro
- 💾 **Exportação**: Exporte grupos como JSON
- ⚡ **Edge Functions**: Serverless com Vercel Edge (sem cold starts)

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
# Com npm
npm install

# Com yarn
yarn install

# Com bun (recomendado)
bun install
```

### 2. Configurar GitHub OAuth App

Para usar o Margea com autenticação OAuth, você precisa criar um GitHub OAuth App:

**Passos:**

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em **OAuth Apps** → **New OAuth App**
3. Configure:
   - **Application name**: `margea-dev`
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:5173/api/auth/callback`
4. Copie o **Client ID** e gere um **Client Secret**
5. Configure as variáveis de ambiente (veja `.env.example`)

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite e preencha com suas credenciais
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/callback
# SESSION_SECRET=$(openssl rand -base64 32)
```

### 3. Compilar Schema GraphQL (Opcional)

Se você modificou o schema GraphQL, rode:

```bash
npm run relay
# ou
bun relay
```

Isso gerará os tipos TypeScript automaticamente a partir das queries GraphQL.

### 4. Rodar o App

```bash
# Modo desenvolvimento
npm run dev
# ou
bun dev

# Build para produção
npm run build
# ou
bun run build

# Preview da build
npm run preview
# ou
bun preview
```

O app estará disponível em `http://localhost:3000`

## 📖 Como Usar o App

### 1. Login

Na primeira tela, clique em **"Login com GitHub"**. Você será redirecionado para o GitHub para autorizar o app. Após autorizar, será redirecionado de volta ao Margea automaticamente.

### 2. Configurar Busca

Configure os parâmetros da busca:

- **Autor (bot)**: Por padrão, `renovate[bot]`
- **Owner/Organização**: (Opcional) Nome do owner ou organização (ex: `facebook`)
- **Repositório específico**: (Opcional) Nome do repositório (ex: `react`)

**Exemplos:**

- Buscar PRs do Renovate em todos os seus repos: deixe owner e repo vazios
- Buscar PRs do Renovate na org `facebook`: preencha owner com `facebook`
- Buscar PRs do Renovate em `facebook/react`: preencha owner com `facebook` e repo com `react`

### 3. Visualizar e Filtrar PRs

Após configurar, você verá:

- **Estatísticas**: Total de PRs, abertos, merged, fechados e número de repositórios
- **Filtros**: Filtre por repositório ou status
- **Grupos**: PRs agrupados por pacote, branch base e labels

### 4. Detalhes do Grupo

Clique em um grupo para ver:

- Lista de todos os PRs do grupo
- Título, status, datas e autor
- Links para abrir cada PR no GitHub

### 5. Funcionalidades Extras

- **Atualizar Dados**: Clique no botão para refazer a busca
- **Exportar JSON**: Exporte os grupos como arquivo JSON
- **Dark Mode**: Use o toggle no header para alternar temas

## 🏗️ Estrutura do Projeto

```
margea/
├── api/                     # Vercel Edge Functions
│   └── auth/                # OAuth endpoints
│       ├── github.ts        # Inicia OAuth flow
│       ├── callback.ts      # Recebe código e gera token
│       ├── token.ts         # Retorna token para frontend
│       └── logout.ts        # Limpa sessão
├── src/
│   ├── components/          # Componentes React
│   │   ├── Header.tsx       # Header com logout e theme toggle
│   │   ├── LoginPage.tsx    # Tela de login OAuth
│   │   ├── MainPage.tsx     # Página principal com config
│   │   ├── PRList.tsx       # Lista de PRs e grupos
│   │   ├── PRGroupCard.tsx  # Card de grupo
│   │   ├── PRGroupDetail.tsx # Detalhes do grupo
│   │   └── ThemeToggle.tsx  # Toggle de tema
│   ├── queries/             # Queries GraphQL
│   │   ├── SearchPRsQuery.ts
│   │   └── ViewerQuery.ts
│   ├── relay/               # Configuração do Relay
│   │   └── environment.ts
│   ├── services/            # Serviços
│   │   ├── auth.ts          # Autenticação OAuth
│   │   └── prGrouping.ts    # Lógica de agrupamento
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Entry point
│   └── index.css            # Estilos globais
├── .env.example             # Exemplo de variáveis de ambiente
├── GITHUB_APP_SETUP.md      # Guia de setup do GitHub OAuth
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── relay.config.json
├── schema.graphql           # Schema do GitHub GraphQL
└── README.md
```

## 🛠️ Stack Técnica

- **React 19**: Framework UI
- **Vite**: Build tool e dev server
- **Relay 20**: Cliente GraphQL com type-safety
- **TypeScript**: Type safety
- **TailwindCSS 4 + DaisyUI 5**: Estilização e componentes
- **Vercel Edge Functions**: OAuth serverless (sem cold starts)
- **Jose**: JWT para sessões seguras
- **GitHub GraphQL API v4**: Fonte de dados

## 🔒 Segurança

- ✅ **OAuth seguro**: Autenticação via GitHub OAuth (sem necessidade de tokens manuais)
- ✅ **Cookie httpOnly**: Token armazenado em cookie seguro (JavaScript não consegue acessar)
- ✅ **JWT criptografado**: Sessões protegidas com JWT usando SESSION_SECRET
- ✅ **HTTPS obrigatório**: Em produção, cookies só funcionam via HTTPS
- ✅ **SameSite strict**: Proteção contra CSRF
- ✅ **Edge Functions**: Processamento serverless próximo ao usuário
- ℹ️ **Nenhum dado persistido**: Tokens não são salvos em banco de dados

## 📝 Notas

### Rate Limit do GitHub

A API do GitHub tem rate limits:

- **Autenticado**: 5.000 requests/hora
- O app exibe informações de rate limit no console

### Limitações

- Busca limitada a 100 PRs por vez (pode ser extendido com paginação)
- Funciona apenas com GitHub.com (não GitHub Enterprise)

## 🚀 Deploy

### Vercel (Recomendado)

O app foi otimizado para deploy na Vercel com Edge Functions:

```bash
# 1. Instale a CLI da Vercel
npm i -g vercel

# 2. Configure variáveis de ambiente
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add GITHUB_CALLBACK_URL
vercel env add SESSION_SECRET

# 3. Deploy
vercel --prod
```

**Importante:** Configure o `GITHUB_CALLBACK_URL` com a URL de produção da Vercel (ex: `https://seu-app.vercel.app/api/auth/callback`)

### Outras Plataformas

Para outras plataformas que suportam Edge Functions/Serverless:

```bash
# Build
npm run build

# Os arquivos estarão em dist/
```

**Nota:** O app requer suporte a Edge Functions para OAuth. Se sua plataforma não suporta, você pode adaptar as funções em `/api/auth/` para Serverless Functions tradicionais.

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças grandes, abra uma issue primeiro.

## 📄 Licença

MIT
