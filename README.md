# Margea

Analisador de Pull Requests do GitHub com foco em PRs automatizados do Renovate Bot.

## 📋 Visão Geral

Margea é um webapp totalmente frontend (sem backend) que permite analisar, agrupar e visualizar Pull Requests do GitHub, especialmente aqueles criados pelo Renovate Bot. O app roda 100% no navegador e usa a GitHub GraphQL API v4 diretamente.

## ✨ Funcionalidades

- 🔐 **Autenticação segura**: Token armazenado apenas localmente (localStorage)
- 🔍 **Busca configurável**: Busque PRs por autor, organização ou repositório
- 📊 **Agrupamento inteligente**: PRs agrupados por pacote, branch base e labels
- 📈 **Estatísticas**: Visualize totais, status e métricas dos PRs
- 🎨 **Filtros**: Filtre por repositório e status (open, merged, closed)
- 🌓 **Dark mode**: Alterne entre temas claro e escuro
- 💾 **Exportação**: Exporte grupos como JSON
- ⚡ **100% Frontend**: Sem backend, apenas arquivos estáticos

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

### 2. Gerar Token do GitHub

Para usar o Margea, você precisa de um Personal Access Token do GitHub:

1. Acesse [GitHub Settings → Developer settings](https://github.com/settings/tokens)
2. Clique em **Personal access tokens** → **Tokens (classic)**
3. Clique em **Generate new token (classic)**
4. Dê um nome ao token (ex: "Margea")
5. Selecione as seguintes permissões:
   - `repo` (Full control of private repositories)
   - Ou, se quiser acesso apenas a repositórios públicos: `public_repo`
6. Clique em **Generate token**
7. **Copie o token** (você só verá uma vez!)

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

Na primeira tela, cole seu GitHub Token no campo de autenticação e clique em **Entrar**.

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
├── src/
│   ├── components/          # Componentes React
│   │   ├── Header.tsx       # Header com logout e theme toggle
│   │   ├── LoginPage.tsx    # Tela de login
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
│   │   ├── auth.ts          # Autenticação
│   │   └── prGrouping.ts    # Lógica de agrupamento
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Entry point
│   └── index.css            # Estilos globais
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── relay.config.json
├── schema.graphql           # Schema do GitHub GraphQL
└── README.md
```

## 🛠️ Stack Técnica

- **React 18**: Framework UI
- **Vite**: Build tool e dev server
- **Relay**: Cliente GraphQL com type-safety
- **TypeScript**: Type safety
- **TailwindCSS + DaisyUI**: Estilização e componentes
- **GitHub GraphQL API v4**: Fonte de dados

## 🔒 Segurança

- O token do GitHub é armazenado apenas no `localStorage` do seu navegador
- Nenhum dado é enviado para servidores externos (exceto GitHub API)
- O app pode ser servido como arquivos estáticos
- Recomenda-se usar tokens com escopo mínimo necessário

## 📝 Notas

### Rate Limit do GitHub

A API do GitHub tem rate limits:

- **Autenticado**: 5.000 requests/hora
- O app exibe informações de rate limit no console

### Limitações

- Busca limitada a 100 PRs por vez (pode ser extendido com paginação)
- Funciona apenas com GitHub.com (não GitHub Enterprise)

## 🚀 Deploy

Para fazer deploy do app:

```bash
# Build
npm run build

# Os arquivos estarão em dist/
# Você pode servir essa pasta com qualquer servidor estático
```

**Opções de deploy:**

- **Vercel**: `vercel deploy`
- **Netlify**: Arraste a pasta `dist/` para Netlify
- **GitHub Pages**: Configure para servir a pasta `dist/`
- **Qualquer servidor estático**: Nginx, Apache, etc.

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças grandes, abra uma issue primeiro.

## 📄 Licença

MIT
