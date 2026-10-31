# ACU DigiVerse - Backend & Database

This folder contains all database schemas, migrations, backend APIs, and server functions for the ACU DigiVerse application.

## Directory Structure

```
Backend/
├── drizzle/              # Drizzle ORM schema and SQL migrations
│   ├── schema.ts         # Main database schema definition
│   └── migrations/       # Versioned SQL migration files
├── drizzle.config.ts     # Drizzle Kit configuration
├── sql/                  # Direct SQL setup scripts
│   ├── supabase_full_migration.sql
│   └── activate_admin_user.sql
├── supabase/             # Supabase configuration (config.toml)
├── src/
│   ├── server.ts         # Backend API HTTP server
│   ├── api/              # API endpoints and background jobs
│   ├── functions/        # Server-side business logic & functions
│   ├── services/         # Core services (reminders, account assignment)
│   ├── policies/         # Access and workflow policy rules
│   ├── integrations/     # Supabase admin client and auth middleware
│   └── emails/           # Transactional email templates & dispatcher
├── package.json
└── tsconfig.json
```

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Supabase and PostgreSQL database credentials:
   ```bash
   cp .env.example .env
   ```

3. **Database Migrations (Drizzle)**:
   - Push schema to database:
     ```bash
     npm run db:push
     ```
   - Open Drizzle Studio UI:
     ```bash
     npm run db:studio
     ```

4. **Start the Backend API Server**:
   ```bash
   npm run dev
   ```
   The API server will listen on port `3001` (or your configured `PORT`).

