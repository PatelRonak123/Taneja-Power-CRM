# Enterprise Full-Stack Application

A production-grade, enterprise-ready full-stack application built with React 19, TypeScript, Express, Drizzle ORM, and PostgreSQL.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/)
- **Server State & Caching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **HTTP Client**: [Axios](https://axios-http.com/) (Centralized Envelope Handler)
- **Validation**: [Zod](https://zod.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Auth**: JWT & Password Hashing with Argon2/Bcrypt

---

## 📁 Repository Structure

```text
.
├── client/                 # Frontend React 19 application
│   ├── src/
│   │   ├── app/            # App-level config, API client, router, providers
│   │   ├── components/     # Layout, UI tokens, feedback components
│   │   ├── features/       # Feature modules (pages, modules, hooks, services, types)
│   │   ├── stores/         # Zustand global stores
│   │   └── ...
│   └── ...
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── common/         # Auth, middleware, errors, logger, utilities
│   │   ├── config/         # Zod environment config and constants
│   │   ├── database/       # Drizzle schema, relations, db client, migrations, seeds
│   │   ├── modules/        # Domain modules (controllers, services, repos, routes, dto)
│   │   └── ...
│   └── ...
├── API_DOCUMENTATION.md    # Detailed API specs and envelopes
├── ARCHITECTURE.md         # Comprehensive architectural reference
├── DATABASE_SETUP.md       # PostgreSQL & Drizzle migration workflow
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18.0.0+)
- PostgreSQL (v14.0+)
- npm or pnpm

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Configure your PostgreSQL connection strings in .env
npm install

# Run database migrations
npx drizzle-kit generate
npm run db:migrate

# Optional: Seed database
npm run db:seed

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

---

## 📜 Available Scripts

### Backend (`server/`)
- `npm run dev`: Start backend development server with hot-reloading
- `npm run build`: Compile TypeScript into production JavaScript
- `npm run start`: Run production server
- `npm run db:generate`: Generate SQL migration files from Drizzle schema
- `npm run db:migrate`: Apply pending migrations to PostgreSQL
- `npm run db:seed`: Seed sample initial data

### Frontend (`client/`)
- `npm run dev`: Start Vite development server
- `npm run build`: Build production bundle
- `npm run preview`: Preview production build

---

## ⚙️ Environment Configuration & Switching

The application is architected to switch behaviors between **Development** and **Production** cleanly based on `NODE_ENV`.

### Quick Environment Switch

#### 1. Development Mode (`NODE_ENV=development`)
Developer-friendly configuration with verbose errors, stack traces, local CORS, debug logging, and local dev server support.

- **Backend (`server/.env`)**:
  ```env
  NODE_ENV=development
  PORT=5000
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/taneja_power_db
  JWT_SECRET=super_secret_jwt_key_for_development_mode_min_32_chars
  CORS_ORIGIN=http://localhost:5173
  COOKIE_SECURE=false
  ```
- **Frontend (`client/.env`)**:
  ```env
  VITE_API_BASE_URL=http://localhost:5000/api/v1
  ```
- **Commands**:
  ```bash
  # Backend
  cd server && npm run dev

  # Frontend
  cd client && npm run dev
  ```

#### 2. Production Mode (`NODE_ENV=production`)
Production-hardened configuration with sanitized error responses (no stack traces leaked to clients), strict CORS origin matching, secure HTTP-only cookies, redacted sensitive logger output, and blocked accidental DB seeds.

- **Backend (`server/.env` or deployment runtime environment)**:
  ```env
  NODE_ENV=production
  PORT=5000
  DATABASE_URL=postgresql://user:password@prod-host:5432/taneja_power_db?sslmode=require
  JWT_SECRET=your_strong_random_secret_at_least_32_characters
  CORS_ORIGIN=https://crm.yourdomain.com
  COOKIE_SECURE=true
  COOKIE_SAME_SITE=lax
  ```
- **Frontend (`client/.env` - must be set before building)**:
  ```env
  VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
  ```
- **Commands**:
  ```bash
  # Backend
  cd server
  npm run build
  npm start

  # Frontend
  cd client
  npm run build
  # Serve dist/ via Nginx, Cloudflare, S3/CloudFront, etc.
  ```

### Variable Classification

| Variable | Scope | Required | Sensitivity | Purpose & Notes |
|:---|:---|:---:|:---:|:---|
| `NODE_ENV` | Backend | **Yes** | Public | `development` \| `production` \| `test`. Fails fast on invalid value. |
| `PORT` | Backend | No | Public | Server port (default: `5000`). |
| `DATABASE_URL` | Backend | **Yes** | **Secret** | PostgreSQL connection string. |
| `JWT_SECRET` | Backend | **Yes** | **Secret** | Min 16 chars (32+ recommended). Dev placeholder rejected in prod. |
| `CORS_ORIGIN` | Backend | **Yes** | Public | Allowed origins (supports comma-separated list). `*` rejected in prod with credentials. |
| `COOKIE_SECURE` | Backend | No | Public | Auto-resolves: `false` in dev, `true` in prod. Configurable override. |
| `COOKIE_SAME_SITE` | Backend | No | Public | `lax` \| `strict` \| `none` (default: `lax`). |
| `COOKIE_DOMAIN` | Backend | No | Public | Optional cookie domain scope (e.g. `.yourdomain.com`). |
| `TRUST_PROXY` | Backend | No | Public | Express reverse proxy hops (auto-enabled as `1` in prod). |
| `RESEND_API_KEY` | Backend | No | **Secret** | Optional Resend API key for emails/OTP. In dev, OTP logs to console if unset. |
| `RESEND_FROM_EMAIL`| Backend | No | Public | Default sender address for Resend. |
| `GOOGLE_MAPS_API_KEY` | Backend | No | **Secret** | Optional Google Places/Geocoding API key for address search. |
| `WHATSAPP_ENABLED` | Backend | No | Public | Set `false` to disable WhatsApp background client (default: `true`). |
| `ALLOW_PRODUCTION_SEED` | Backend | No | Public | Safeguard against accidental `npm run db:seed` in prod (default: `false`). |
| `VITE_API_BASE_URL` | Frontend | **Yes** | Public | Base API endpoint consumed by Axios client (e.g. `https://api.domain.com/api/v1`). |
| `VITE_APP_NAME` | Frontend | No | Public | Brand display name. |

