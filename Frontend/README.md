# ACU DigiVerse - Frontend (UI)

This folder contains all UI code, pages, components, client-side routing, styles, and assets for the ACU DigiVerse application.

## Directory Structure

```
Frontend/
├── public/               # Static assets, ACU web application, clean branding
│   ├── acu/              # Core ACU event management scripts & styles
│   ├── favicon.svg       # Branded ACU icon
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── assets/           # Digital assets and templates
│   ├── components/       # Reusable React UI components (Radix + Tailwind)
│   ├── hooks/            # React hooks
│   ├── lib/              # Client-side helper utilities
│   ├── routes/           # TanStack Router UI pages and layouts
│   ├── integrations/     # Supabase client SDK
│   ├── router.tsx        # Router setup
│   └── styles.css        # Tailwind and custom UI theme
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port Vite provides) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   ```

