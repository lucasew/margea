# Margea

<a href="https://hosted.weblate.org/engage/margea/">
<img src="https://hosted.weblate.org/widget/margea/multi-auto.svg" alt="Estado de la traducción" />
</a>

[[English](README_en.md)] [[Español](README_es.md)] [[Português](README.md)]

Analizador de Pull Requests de GitHub centrado en PRs automatizados de Renovate Bot.

## 📋 Visión General

Margea es una aplicación web totalmente frontend (sin backend) que permite analizar, agrupar y visualizar Pull Requests de GitHub, especialmente aquellos creados por Renovate Bot. La aplicación se ejecuta 100% en el navegador y utiliza directamente la API GraphQL v4 de GitHub.

## ✨ Funcionalidades

- 🔐 **OAuth con GitHub**: Inicio de sesión seguro con GitHub (sin necesidad de generar tokens manualmente)
- 🔍 **Búsqueda configurable**: Busque PRs por autor, organización o repositorio
- 📊 **Agrupación inteligente**: PRs agrupados por paquete, rama base y etiquetas
- 📈 **Estadísticas**: Visualice totales, estado y métricas de los PRs
- 🎨 **Filtros**: Filtre por repositorio y estado (abierto, fusionado, cerrado)
- 🌓 **Modo oscuro**: Cambie entre temas claro y oscuro
- 💾 **Exportación**: Exporte grupos como JSON
- ⚡ **Edge Functions**: Serverless con Vercel Edge (sin arranques en frío)

## 🚀 Cómo Usar

### 1. Instalar Dependencias

```bash
# Con npm
npm install

# Con yarn
yarn install

# Con bun (recomendado)
bun install
```

### 2. Configurar GitHub OAuth App

Para usar Margea con autenticación OAuth, necesita crear una GitHub OAuth App:

**Pasos:**

1. Vaya a [GitHub Developer Settings](https://github.com/settings/developers)
2. Haga clic en **OAuth Apps** → **New OAuth App**
3. Configure:
   - **Application name**: `margea-dev`
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:5173/api/auth/callback`
4. Copie el **Client ID** y genere un **Client Secret**
5. Configure las variables de entorno (ver `.env.example`)

```bash
# Copie el archivo de ejemplo
cp .env.example .env.local

# Edite y complete con sus credenciales
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# GITHUB_CALLBACK_URL=http://localhost:5173/api/auth/callback
# SESSION_SECRET=$(openssl rand -hex 32)
```

### 3. Compilar Schema GraphQL (Opcional)

Si modificó el esquema GraphQL, ejecute:

```bash
npm run relay
# o
bun relay
```

Esto generará automáticamente los tipos TypeScript a partir de las consultas GraphQL.

### 4. Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run dev
# o
bun dev

# Build para producción
npm run build
# o
bun run build

# Vista previa del build
npm run preview
# o
bun preview
```

La aplicación estará disponible en `http://localhost:3000`

## 📖 Cómo Usar la Aplicación

### 1. Iniciar Sesión

En la primera pantalla, haga clic en **"Login com GitHub"**. Será redirigido a GitHub para autorizar la aplicación. Después de autorizar, será redirigido automáticamente de vuelta a Margea.

### 2. Configurar Búsqueda

Configure los parámetros de búsqueda:

- **Autor (bot)**: Por defecto es `renovate[bot]`
- **Owner/Organización**: (Opcional) Nombre del propietario u organización (ej: `facebook`)
- **Repositorio específico**: (Opcional) Nombre del repositorio (ej: `react`)

**Ejemplos:**

- Buscar PRs de Renovate en todos sus repositorios: deje owner y repo vacíos
- Buscar PRs de Renovate en la org `facebook`: complete owner con `facebook`
- Buscar PRs de Renovate en `facebook/react`: complete owner con `facebook` y repo con `react`

### 3. Ver y Filtrar PRs

Después de configurar, verá:

- **Estadísticas**: Total de PRs, abiertos, fusionados, cerrados y número de repositorios
- **Filtros**: Filtre por repositorio o estado
- **Grupos**: PRs agrupados por paquete, rama base y etiquetas

### 4. Detalles del Grupo

Haga clic en un grupo para ver:

- Lista de todos los PRs del grupo
- Título, estado, fechas y autor
- Enlaces para abrir cada PR en GitHub

### 5. Funcionalidades Extra

- **Actualizar Datos**: Haga clic en el botón para rehacer la búsqueda
- **Exportar JSON**: Exporte los grupos como archivo JSON
- **Modo Oscuro**: Use el interruptor en el encabezado para cambiar temas

## 🏗️ Estructura del Proyecto

```
margea/
├── api/                     # Vercel Edge Functions
│   └── auth/                # Endpoints OAuth
│       ├── github.ts        # Inicia flujo OAuth
│       ├── callback.ts      # Recibe código y genera token
│       ├── token.ts         # Devuelve token al frontend
│       └── logout.ts        # Limpia sesión
├── src/
│   ├── components/          # Componentes React
│   │   ├── Header.tsx       # Encabezado con logout y cambio de tema
│   │   ├── LoginPage.tsx    # Pantalla de inicio de sesión OAuth
│   │   ├── MainPage.tsx     # Página principal con config
│   │   ├── PRList.tsx       # Lista de PRs y grupos
│   │   ├── PRGroupCard.tsx  # Tarjeta de grupo
│   │   ├── PRGroupDetail.tsx # Detalles del grupo
│   │   └── ThemeToggle.tsx  # Interruptor de tema
│   ├── queries/             # Consultas GraphQL
│   │   ├── SearchPRsQuery.ts
│   │   └── ViewerQuery.ts
│   ├── relay/               # Configuración de Relay
│   │   └── environment.ts
│   ├── services/            # Servicios
│   │   ├── auth.ts          # Autenticación OAuth
│   │   └── prGrouping.ts    # Lógica de agrupación
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
├── .env.example             # Ejemplo de variables de entorno
├── GITHUB_APP_SETUP.md      # Guía de configuración de GitHub OAuth
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── relay.config.json
├── schema.graphql           # Esquema GraphQL de GitHub
└── README.md
```

## 🛠️ Stack Técnico

- **React 19**: Framework UI
- **Vite**: Herramienta de compilación y servidor de desarrollo
- **Relay 20**: Cliente GraphQL con seguridad de tipos
- **TypeScript**: Seguridad de tipos
- **TailwindCSS 4 + DaisyUI 5**: Estilos y componentes
- **Vercel Edge Functions**: OAuth serverless (sin arranques en frío)
- **Jose**: JWT para sesiones seguras
- **GitHub GraphQL API v4**: Fuente de datos

## 🔒 Seguridad

- ✅ **OAuth seguro**: Autenticación vía GitHub OAuth (sin necesidad de tokens manuales)
- ✅ **Cookie HttpOnly**: Token almacenado en cookie segura (JavaScript no puede acceder)
- ✅ **JWT cifrado**: Sesiones protegidas con JWT usando SESSION_SECRET
- ✅ **HTTPS obligatorio**: En producción, las cookies solo funcionan vía HTTPS
- ✅ **SameSite strict**: Protección contra CSRF
- ✅ **Edge Functions**: Procesamiento serverless cerca del usuario
- ℹ️ **Sin persistencia de datos**: Los tokens no se guardan en base de datos

## 📝 Notas

### Rate Limit de GitHub

La API de GitHub tiene límites de tasa:

- **Autenticado**: 5.000 solicitudes/hora
- La aplicación muestra información de límite de tasa en la consola

### Limitaciones

- Búsqueda limitada a 100 PRs a la vez (se puede extender con paginación)
- Funciona solo con GitHub.com (no GitHub Enterprise)

## 🚀 Despliegue

### Vercel (Recomendado)

La aplicación fue optimizada para despliegue en Vercel con Edge Functions:

```bash
# 1. Instale la CLI de Vercel
npm i -g vercel

# 2. Configure variables de entorno
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add GITHUB_CALLBACK_URL
vercel env add SESSION_SECRET

# 3. Despliegue
vercel --prod
```

**Importante:** Configure `GITHUB_CALLBACK_URL` con la URL de producción de Vercel (ej: `https://su-app.vercel.app/api/auth/callback`)

### Otras Plataformas

Para otras plataformas que soportan Edge Functions/Serverless:

```bash
# Build
npm run build

# Los archivos estarán en dist/
```

**Nota:** La aplicación requiere soporte de Edge Functions para OAuth. Si su plataforma no lo admite, puede adaptar las funciones en `/api/auth/` a Serverless Functions tradicionales.

## 🤝 Contribuyendo

¡Los pull requests son bienvenidos! Para cambios grandes, por favor abra un issue primero.

## 📄 Licencia

MIT
