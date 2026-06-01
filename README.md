# Arche

A private, single-user workspace for organising notes, checklists, lists, and cards with Supabase-powered sync.

## Features

- **Four item types**: Markdown notes, checklists, bullet lists, and title+description cards
- **Pin & reorder**: Pin collections and items; drag to reorder
- **Auto-save**: Debounced saves with “Saved” / offline “Pending sync” feedback
- **Global search**: Search collection names, tags, and item content (`/` or header button)
- **Command palette**: Quick actions via `⌘K` / `Ctrl+K`
- **Keyboard shortcuts**: `N` new collection, `/` search, `⌘S` flush saves, `Esc` close modals
- **Archive**: Hide collections without deleting (separate from recycle bin)
- **Duplicate**: Copy collections or individual items
- **Bulk select**: Select multiple collections or items for pin, duplicate, archive, delete, collapse/expand
- **Labels**: Collection colors and comma-separated tags
- **Checklist progress**: Collapsed checklists show `3/7 done`
- **Export**: Full JSON backup, or per-collection Markdown / ZIP / JSON
- **Recycle bin**: Soft-delete with restore or permanent purge
- **PWA**: Installable app with offline shell (edits queue when offline)
- **Dark & light mode** with persisted preference
- **Realtime sync** across tabs
- **Session security**: Inactivity logout (2h), max session (24h), login rate limit
- **End-to-end encryption**: Collection names, descriptions, tags, item titles, and item content are encrypted in the browser (AES-256-GCM) before Supabase stores them. Only ciphertext is on the server.

## Encryption (private workspace)

Sensitive data is encrypted **client-side** with a key derived from your account password (PBKDF2, 310k iterations). Supabase and operators only see encrypted blobs (prefixed with `arc1:`).

| Stored encrypted | Left plaintext (for queries/UI structure) |
|------------------|-------------------------------------------|
| Collection name, description, tags | `id`, `user_id`, `position`, `pinned`, `color`, timestamps |
| Item title, content | `id`, `collection_id`, `type`, `position`, `pinned`, soft-delete/archive fields |

**Flow**

1. Sign in (or create account) - your password unlocks the vault for this session.
2. After a full page reload, enter your password again on the **Unlock vault** screen (the key is never persisted to disk).
3. Export/import backups are plaintext JSON on your machine; re-import encrypts before upload.

For a new Supabase project, run the full `database.sql` file before signing in.

## Tech stack

- React 19 + Vite (route-level code splitting)
- Tailwind CSS + CSS variables
- TanStack Query
- Supabase (PostgreSQL, RLS, Realtime)
- vite-plugin-pwa + JSZip

## Setup

1. **Clone & install**
   ```bash
   git clone https://github.com/patkarmandar/Arche
   cd Arche
   npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the full `database.sql` in the SQL Editor

3. **Environment**
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Run**
   ```bash
   npm run dev
   ```

5. **Users**
   - **Single-user (default)**: Create a user in Supabase Auth dashboard; sign in only.
   - **Multi-user**: Set `VITE_ALLOW_SIGNUP=true` in `.env`, enable **Email** provider in Supabase Auth → Providers, and allow sign-ups. Each user gets an isolated workspace (RLS enforces `user_id`).

## Project structure

- `src/components/` - UI, editors, command palette, global search
- `src/context/` - Auth, theme, toasts, shortcuts, command palette, page actions
- `src/hooks/` - Collections, items, archive, recycle bin, stats, offline sync
- `src/pages/` - Dashboard, collection, archive, recycle bin, login
- `src/lib/crypto/` - AES-GCM cipher, PBKDF2 key derivation, vault setup/unlock
- `src/lib/` - Supabase, export/import, offline queue, search, encrypt/decrypt helpers

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Command palette |
| `N` | New collection (dashboard) |
| `/` | Focus collection search / open global search |
| `⌘S` / `Ctrl+S` | Save all dirty items on current page |
| `Esc` | Close modals / menus |

## License

See [LICENSE](LICENSE).
