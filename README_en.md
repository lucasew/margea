# Margea

<a href="https://hosted.weblate.org/engage/margea/">
<img src="https://hosted.weblate.org/widget/margea/multi-auto.svg" alt="Translation status" />
</a>

[[English](README_en.md)] [[Español](README_es.md)] [[Português](README.md)]

GitHub Pull Request Analyzer focused on Renovate Bot automated PRs.

## 📋 Overview

Margea is a fully frontend (no backend) webapp that allows you to analyze, group, and visualize GitHub Pull Requests, especially those created by Renovate Bot. The app runs 100% in the browser and uses the GitHub GraphQL API v4 directly.

## ✨ Features

- 🔐 **GitHub OAuth**: Secure login with GitHub (no need to manually generate tokens)
- 🔍 **Configurable Search**: Search PRs by author, organization, or repository
- 📊 **Intelligent Grouping**: PRs grouped by package, base branch, and labels
- 📈 **Statistics**: Visualize totals, status, and PR metrics
- 🎨 **Filters**: Filter by repository and status (open, merged, closed)
- 🌓 **Dark mode**: Toggle between light and dark themes
- 💾 **Export**: Export groups as JSON
- ⚡ **Edge Functions**: Serverless with Vercel Edge (no cold starts)

## 🚀 How to Use

### 1. Install Dependencies

```bash
# With npm
npm install

# With yarn
yarn install

# With bun (recommended)
bun install
```

### 2. Configure GitHub OAuth App

To use Margea with OAuth authentication, you need to create a GitHub OAuth App:

**Steps:**

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on **OAuth Apps** → **New OAuth App**
3. Configure:
   - **Application name**: `margea-dev`
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:5173/api/auth/callback`
4. Copy the **Client ID** and generate a **Client Secret**
5. Configure environment variables (see `.env.example`)

```bash
# Copy the example file
cp .env.example .env.local

# Edit and fill in your credentials
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/callback
# SESSION_SECRET=$(openssl rand -base64 32)
```

### 3. Compile GraphQL Schema (Optional)

If you modified the GraphQL schema, run:

```bash
npm run relay
# or
bun relay
```

This will automatically generate TypeScript types from the GraphQL queries.

### 4. Run the App

```bash
# Development mode
npm run dev
# or
bun dev

# Production build
npm run build
# or
bun run build

# Build preview
npm run preview
# or
bun preview
```

The app will be available at `http://localhost:3000`

## 📖 How to Use the App

### 1. Login

On the first screen, click **"Login with GitHub"**. You will be redirected to GitHub to authorize the app. After authorization, you will be automatically redirected back to Margea.

### 2. Configure Search

Configure the search parameters:

- **Author (bot)**: Default is `renovate[bot]`
- **Owner/Organization**: (Optional) Owner or organization name (e.g., `facebook`)
- **Specific Repository**: (Optional) Repository name (e.g., `react`)

**Examples:**

- Search Renovate PRs in all your repos: leave owner and repo empty
- Search Renovate PRs in the `facebook` org: fill owner with `facebook`
- Search Renovate PRs in `facebook/react`: fill owner with `facebook` and repo with `react`

### 3. View and Filter PRs

After configuring, you will see:

- **Statistics**: Total PRs, open, merged, closed, and number of repositories
- **Filters**: Filter by repository or status
- **Groups**: PRs grouped by package, base branch, and labels

### 4. Group Details

Click on a group to see:

- List of all PRs in the group
- Title, status, dates, and author
- Links to open each PR on GitHub

### 5. Extra Features

- **Refresh Data**: Click the button to redo the search
- **Export JSON**: Export groups as a JSON file
- **Dark Mode**: Use the toggle in the header to switch themes

## 🏗️ Project Structure

```
margea/
├── api/                     # Vercel Edge Functions
│   └── auth/                # OAuth endpoints
│       ├── github.ts        # Initiates OAuth flow
│       ├── callback.ts      # Receives code and generates token
│       ├── token.ts         # Returns token to frontend
│       └── logout.ts        # Clears session
├── src/
│   ├── components/          # React Components
│   │   ├── Header.tsx       # Header with logout and theme toggle
│   │   ├── LoginPage.tsx    # OAuth login screen
│   │   ├── MainPage.tsx     # Main page with config
│   │   ├── PRList.tsx       # List of PRs and groups
│   │   ├── PRGroupCard.tsx  # Group card
│   │   ├── PRGroupDetail.tsx # Group details
│   │   └── ThemeToggle.tsx  # Theme toggle
│   ├── queries/             # GraphQL Queries
│   │   ├── SearchPRsQuery.ts
│   │   └── ViewerQuery.ts
│   ├── relay/               # Relay Configuration
│   │   └── environment.ts
│   ├── services/            # Services
│   │   ├── auth.ts          # OAuth Authentication
│   │   └── prGrouping.ts    # Grouping logic
│   ├── types/               # TypeScript Types
│   │   └── index.ts
│   ├── App.tsx              # Main component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── .env.example             # Environment variables example
├── GITHUB_APP_SETUP.md      # GitHub OAuth setup guide
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── relay.config.json
├── schema.graphql           # GitHub GraphQL Schema
└── README.md
```

## 🛠️ Tech Stack

- **React 19**: UI Framework
- **Vite**: Build tool and dev server
- **Relay 20**: GraphQL client with type-safety
- **TypeScript**: Type safety
- **TailwindCSS 4 + DaisyUI 5**: Styling and components
- **Vercel Edge Functions**: Serverless OAuth (no cold starts)
- **Jose**: JWT for secure sessions
- **GitHub GraphQL API v4**: Data source

## 🔒 Security

- ✅ **Secure OAuth**: Authentication via GitHub OAuth (no need for manual tokens)
- ✅ **HttpOnly Cookie**: Token stored in secure cookie (JavaScript cannot access)
- ✅ **Encrypted JWT**: Sessions protected with JWT using SESSION_SECRET
- ✅ **Mandatory HTTPS**: In production, cookies only work via HTTPS
- ✅ **SameSite strict**: Protection against CSRF
- ✅ **Edge Functions**: Serverless processing close to the user
- ℹ️ **No Data Persisted**: Tokens are not saved in a database

## 📝 Notes

### GitHub Rate Limit

The GitHub API has rate limits:

- **Authenticated**: 5,000 requests/hour
- The app displays rate limit information in the console

### Limitations

- Search limited to 100 PRs at a time (can be extended with pagination)
- Works only with GitHub.com (not GitHub Enterprise)

## 🚀 Deploy

### Vercel (Recommended)

The app is optimized for deployment on Vercel with Edge Functions:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Configure environment variables
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add GITHUB_CALLBACK_URL
vercel env add SESSION_SECRET

# 3. Deploy
vercel --prod
```

**Important:** Configure `GITHUB_CALLBACK_URL` with your Vercel production URL (e.g., `https://your-app.vercel.app/api/auth/callback`)

### Other Platforms

For other platforms that support Edge Functions/Serverless:

```bash
# Build
npm run build

# Files will be in dist/
```

**Note:** The app requires Edge Functions support for OAuth. If your platform doesn't support it, you can adapt the functions in `/api/auth/` to traditional Serverless Functions.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT
