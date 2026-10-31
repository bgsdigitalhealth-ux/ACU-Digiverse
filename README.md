# ACU DigiVerse

Adichunchanagiri University's unified digital platform for event management, institutional reporting, and academic workflows.

---

## Project Structure

The project has been separated into two independent folders:

```
ACU_Dig/
├── Frontend/             # All UI, Components, Pages, and Client Assets
└── Backend/              # Database, Drizzle ORM, Supabase Migrations, APIs & Server Functions
```

---

## 1. Frontend

Contains all UI components, pages, routing, animations, and client-side styling.

### Tech Stack
- **Framework:** React 19, TanStack Router, TanStack Start
- **Styling:** Tailwind CSS, Radix UI, Lucide Icons
- **3D Visualization:** Three.js, React Three Fiber, Drei

### Quick Start
```bash
cd Frontend
npm install
npm run dev
```

---

## 2. Backend

Contains all database schemas, SQL migrations, server-side APIs, background jobs, and auth middleware.

### Tech Stack
- **Database & ORM:** PostgreSQL, Drizzle ORM, Supabase
- **Server:** Node.js / TypeScript Server API
- **Emails:** React Email transactional templates and dispatcher

### Quick Start
```bash
cd Backend
npm install
npm run dev
```

### Database Operations
```bash
cd Backend
# Push schema changes directly to DB
npm run db:push

# Launch Drizzle Studio GUI
npm run db:studio
```

