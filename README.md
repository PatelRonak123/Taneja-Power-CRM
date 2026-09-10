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
