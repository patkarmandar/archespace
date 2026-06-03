# Arche

A private, encrypted workspace for organising notes, checklists, lists, and cards with Supabase-powered sync.

## Features

- **Encrypted vault with PIN unlock**: Data is encrypted client-side (AES-256-GCM). Login password and vault PIN are separate.
- **Vault migration support**: Legacy password-derived vaults are upgraded once to PIN-based vaults.
- **Session + vault security**:
  - Login session persists until manual logout or max 1 week.
  - Vault auto-locks after 24 hours.
  - Vault can be manually locked from dashboard.
- **Unified search**: One dashboard search bar that searches spaces, tags, and item content (notes/checklists/lists/cards) with rich results.
- **Four item types**: Markdown notes, checklists, bullet lists, and title+description cards.
- **Pin & reorder**: Pin spaces/items and drag to reorder.
- **Bulk actions**:
  - Dashboard spaces: pin/unpin, duplicate, archive, delete.
  - Space items: pin/unpin, duplicate, archive, delete, collapse/expand.
  - Recycle bin/archive: multi-select restore (and purge in recycle bin).
- **Archive + recycle bin**:
  - Archive hides without deleting.
  - Recycle bin supports restore and permanent delete.
- **Auto-save + offline queue**: Debounced saves with offline pending sync behavior.
- **Command palette**: Quick actions via `⌘K` / `Ctrl+K`.
- **Compact settings page**: Accordion sections for password, PIN, and backup import/export.
- **PWA**: Installable app with offline shell.
- **Realtime sync** across tabs.
- **Dark/light mode** with persisted preference.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Command palette |
| `N` | New space (dashboard) |
| `/` | Focus dashboard search |
| `⌘S` / `Ctrl+S` | Save all dirty items on current page |
| `Esc` | Close modals / menus |

## Security model

- Sensitive data is encrypted in the browser before Supabase storage.
- Encrypted at rest in DB:
  - Space: name, description, tags
  - Item: title, content
- Plaintext metadata for structure/querying:
  - IDs, positions, pinned flags, type, timestamps, soft-delete/archive flags
- Backup files are JSON on your machine; imported data is encrypted before upload.

For a new Supabase project, run the full `database.sql` before signing in.

## Tech stack

- React 19 + Vite (route-level code splitting)
- Tailwind CSS + CSS variables
- TanStack Query
- Supabase (PostgreSQL, RLS, Realtime)
- vite-plugin-pwa

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

6. **Schema update for existing projects**
   - Ensure `user_encryption` includes:
     - `wrapped_key` (nullable text)
     - `vault_format` (text, default `'legacy'`)
   - These are included in `database.sql`.

## Project structure

- `src/components/` - UI, editors, command palette
- `src/context/` - Auth, theme, toasts, shortcuts, command palette, page actions
- `src/hooks/` - Spaces, items, archive, recycle bin, global search data, stats, offline sync
- `src/pages/` - Dashboard, space, archive, recycle bin, login, settings
- `src/lib/crypto/` - AES-GCM cipher, PBKDF2 key derivation, vault PIN/session handling
- `src/lib/` - Supabase, export/import, offline queue, search, encrypt/decrypt helpers

## License

See [LICENSE](LICENSE).
