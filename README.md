# Arche

A private, single-user workspace for organising notes, checklists, lists, and cards with Supabase-powered sync.

## Features
- **Four Note Types**: Free-form markdown notes, interactive checklists, bullet lists, and title+description cards.
- **Pin & Reorder**: Pin important collections and items to the top. Drag and drop items to reorder them.
- **Auto-Save**: Edits are automatically saved to the database.
- **Recycle Bin**: Soft-delete system prevents accidental data loss.
- **Backup & Restore**: Export all data to a JSON file and import it anytime.
- **Dark & Light Mode**: Built-in theme toggle.
- **Realtime Sync**: Open Arche on multiple tabs/devices and see changes instantly.

## Tech Stack
- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS + Custom CSS Variables
- **State/Caching**: React Query (TanStack Query)
- **Database/Auth**: Supabase (PostgreSQL, Row Level Security, Realtime)

## Setup

1. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd Arche
   npm install
   ```

2. **Supabase Project Setup**
   - Create a new project in [Supabase](https://supabase.com).
   - Go to the **SQL Editor** in your Supabase dashboard.
   - Copy the contents of `database.sql` (found in the root of this repository) and run it. This creates the tables, triggers, indexes, and policies.

3. **Environment Variables**
   - Create a `.env` file in the root directory (copy `.env.example`).
   - Add your Supabase project URL and anon key:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

5. **Create a User**
   Arche does not have public registration. To log in, you must manually create a user in your Supabase Auth dashboard. Use the email and password you set there to sign into the app.

## Project Structure
- `src/components/` — Shared UI elements and collection items.
- `src/context/` — React Context providers for Auth, Theme, and Toast notifications.
- `src/hooks/` — Data fetching hooks (`useData.js`) and utilities.
- `src/pages/` — Main views (Dashboard, Collection, Recycle Bin, Login).
- `src/lib/` — Singleton configurations (e.g., Supabase client).
