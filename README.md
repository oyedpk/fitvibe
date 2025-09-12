# FitVibe (React + Supabase)

Lightweight fitness tracker (calories + workouts) with magic-link auth and per-user data via Row Level Security.

## Features
- Log **meals** with calories & protein.
- Log **workouts** with sets as `reps@kg` strings.
- Magic-link sign-in via Supabase.
- Clean React UI (Vite + Tailwind + Framer Motion).

## Stack
- React 18 + Vite
- Tailwind CSS
- Supabase JS v2
- TypeScript

## Quick Start (Local)
1. **Install deps**
   ```bash
   pnpm i   # or npm install / yarn
   ```

2. **Environment variables**
   - Copy `.env.example` → `.env`
   - Set:
     ```bash
     VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
     VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
     ```
   - **Code compatibility note**: The current `src/App.tsx` (from your canvas) uses CRA-style envs: `process.env.REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`.
     Vite uses `import.meta.env.VITE_*`. You have two options:
     - **Option A (recommended):** Change the top of `src/App.tsx` to:
       ```ts
       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
       const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
       ```
       This keeps both formats working.
     - **Option B:** Rename your `.env` keys to `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` and run with a CRA-like setup (not recommended here).

3. **Create database schema (Supabase SQL editor)**
   - Open your project → **SQL** → **New query** → paste and run:
   ```sql

-- Tables
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  name text,
  sex text check (sex in ('male','female')) default 'male',
  age int default 30,
  height_cm int default 175,
  weight_kg numeric default 77,
  activity text check (activity in ('sedentary','light','moderate','active','veryActive')) default 'moderate',
  goal text check (goal in ('fatLoss','maintain','gain')) default 'fatLoss',
  protein_per_kg numeric default 2.0
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  calories int not null,
  protein int default 0,
  created_at timestamptz default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  reps int not null,
  weight_kg numeric not null
);

-- RLS
alter table profiles enable row level security;
alter table meals enable row level security;
alter table workouts enable row level security;
alter table sets enable row level security;

create policy if not exists "profiles owner"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy if not exists "meals owner"
  on meals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "workouts owner"
  on workouts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "sets via workout"
  on sets for all
  using (
    exists(select 1 from workouts w where w.id = sets.workout_id and w.user_id = auth.uid())
  )
  with check (
    exists(select 1 from workouts w where w.id = sets.workout_id and w.user_id = auth.uid())
  );

   ```

4. **Auth callback (for magic links)**
   - In Supabase **Authentication → URL Configuration**:
     - Add your local URL to **Redirect URLs**, e.g. `http://localhost:5173`.
     - Add your production URL after deploy.

5. **Run dev server**
   ```bash
   pnpm dev
   ```
   Visit `http://localhost:5173` → click **Sign in** → enter your email → check inbox for the magic link.

## Deploy
### Vercel
- Create a Vercel project and set **Environment Variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Build command: `pnpm build` (or `npm run build`), Output: `dist`.
- (Optional) Use the provided `vercel.json` and GitHub Action in the canvas scaffold.

### Netlify
- Site settings → Build & deploy:
  - Build: `pnpm build`
  - Publish: `dist`
- Environment variables same as above.
- (Optional) Use `netlify.toml` and the provided GitHub Action.

## Troubleshooting
- **Magic link opens but stays logged out**: Ensure your local URL is present in Supabase **Redirect URLs**.
- **RLS errors**: Double-check policies above; ensure every table has RLS enabled.
- **CORS/Network**: In Supabase **Auth → Settings → URL configuration**, set the site URL; in **Project Settings → API**, ensure the URL you use matches your project URL.

## Roadmap (nice-to-haves)
- Favorites & templates for meals/exercises.
- Body weight tracking + moving average trend.
- PWA install + offline cache.
- Recommendation engine based on gaps & progression.

---

Made for fast vibecoding. Ship it! 🚀
