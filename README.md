# Arche Space

Arche Space is an open source, private, encrypted space for organizing ideas, plans, notes, checklists, and cards. It is built as a self-hostable web app with Supabase sync and a client-side encrypted vault, ensuring that your saved content stays private - even from the application owner and developers.

## Table of contents

- [Features](#features)
- [Security features](#security-features)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Security model](#security-model)
- [Required Supabase setup](#required-supabase-setup)
- [Environment variables](#environment-variables)
- [Setup](#setup)
- [Single-user and multi-user modes](#single-user-and-multi-user-modes)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Deployment notes](#deployment-notes)
- [Help & support](#help--support)
- [Contributing & development](#contributing--development)
- [License](#license)

## Features

- Multiple spaces for separating ideas, projects, plans, references, and personal systems.
- Markdown notes for free-form writing.
- Checklists for tasks, routines, and progress tracking.
- Menu-style lists for lightweight structured information.
- Cards with title and description fields for planning and grouping ideas.
- Pinning for important spaces and items.
- Drag-and-drop reordering for spaces and items.
- Bulk actions for spaces and items.
- Duplicate, archive, restore, and delete workflows.
- Recycle bin with restore and permanent delete.
- Archive area for hiding content without deleting it.
- Unified dashboard search across spaces, tags, and item content.
- Command palette with `Ctrl+K` / `Cmd+K`.
- Import and export backup JSON files.
- Dark and light themes.
- Single-user self-hosting mode by default.
- Optional multi-user mode with Supabase Auth sign-up enabled.
- Offline queue for pending changes while the browser is offline.
- PWA support through `vite-plugin-pwa`.

## Security features

- Client-side AES-GCM encryption protects saved spaces and items before data reaches Supabase.
- Vault PIN uses PBKDF2 key derivation to wrap the vault master key; login password and vault PIN are separate credentials.
- After login, vault PIN unlock is required to decrypt vault data; the vault session lives only in browser session storage and auto-locks after 24 hours, while the login session has an absolute lifetime of 1 week.
- A one-time recovery code is generated at initial vault setup and can be recreated/replaced anytime from Settings by entering the current PIN.
- Forgot PIN flow uses the recovery code to unwrap the vault master key and set a new PIN; generating a new code replaces and invalidates the previous one.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Focus dashboard search |
| `N` | Create a new space on the dashboard |
| `Ctrl+S` / `Cmd+S` | Save all dirty items on the current page |
| `Esc` | Close menus, modals, or active overlays |

## Security model

Arche Space uses a browser-side vault model. Users sign in with Supabase Auth, then unlock a separate vault PIN to access encrypted workspace data. Login password and vault PIN are separate credentials.

The vault PIN is never stored as plaintext. On setup, the browser generates a random vault master key. This key is wrapped using a PIN-derived key (PBKDF2). Workspace content is encrypted with AES-GCM before it reaches Supabase.

Vault unlock is required after login to decrypt data. The vault session lives only in browser session storage and auto-locks after 24 hours. The login session lasts up to 1 week.

A one-time recovery code is generated at vault setup and can be replaced anytime from Settings using the current PIN. If the PIN is forgotten, the recovery code unwraps the master key once, then a new PIN and recovery code are created. The old code is invalidated.

**Encrypted fields**
- Space name
- Space description
- Space tags
- Item title
- Item content

**Plain metadata**
- User IDs
- Row IDs
- Space and item positions
- Item type
- Pinned, archive, and soft-delete flags
- Created and updated timestamps

**Important limits**
- The application cannot recover encrypted content without either the current vault PIN or the current recovery code.
- Developers and app owners cannot read saved user content from the database because stored content is encrypted before upload.
- If both the vault PIN and recovery code are lost, encrypted workspace data cannot be decrypted.
- JSON exports are downloaded to the user's machine and should be stored carefully.
- Imported backup data is encrypted before upload.

## Required Supabase setup

1. Create a Supabase project.
2. Run the full `database.sql` file in the Supabase SQL Editor.
3. Enable the Email provider in Supabase Auth.
4. Configure Resend as the SMTP server in Supabase Auth for password reset and auth emails.
5. Add your deployed app URL to Supabase Auth redirect URLs.
6. Add `https://your-domain/reset-password` to Supabase Auth redirect URLs for password reset links.
7. Keep Supabase Auth sign-in rate limits at `30/hour per IP` or lower for production.
8. Tighten sign-up and password-reset limits before enabling public multi-user sign-up.
9. Re-run `database.sql` on older deployments to add vault recovery and PIN lockout columns/functions.
10. Run `NOTIFY pgrst, 'reload schema';` after database changes if the Supabase schema cache does not refresh immediately.

## Environment variables

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Optional multi-user sign-up:

```env
VITE_ALLOW_SIGNUP=true
```

or:

```env
VITE_MULTI_USER=true
```

## Setup

1. Clone the repository.
   ```bash
   git clone https://github.com/patkarmandar/Arche
   cd Arche
   ```
2. Install dependencies.
   ```bash
   npm install
   ```
3. Create a Supabase project.
4. Run `database.sql` in the Supabase SQL Editor.
5. Create `.env` with the required Supabase variables.
6. Start the development server.
   ```bash
   npm run dev
   ```
7. Build for production.
   ```bash
   npm run build
   ```
8. Preview the production build locally.
   ```bash
   npm run preview
   ```

## Single-user and multi-user modes

Single-user mode is the default. Create one user in the Supabase Auth dashboard and keep public sign-up disabled.

Multi-user mode is optional. Set `VITE_ALLOW_SIGNUP=true` or `VITE_MULTI_USER=true`, enable Supabase Auth email sign-ups, configure Resend SMTP, and verify RLS policies before public deployment.

## Tech stack

- React 19, React Router 7, Vite 8 + PWA plugin
- Tailwind CSS 3 with CSS custom properties for theming
- Supabase (Auth, PostgreSQL, Row Level Security, Realtime) as backend
- Resend SMTP via Supabase Auth for emails
- TanStack Query 5 for data fetching
- Web Crypto API for client-side encryption
- Lucide React icons, JSZip, ESLint 10

## Project structure

```text
Arche/
  public/
    _headers
  src/
    assets/
    components/
      editors/
      layout/
      space/
      ui/
    context/
    hooks/
    lib/
      crypto/
    pages/
    test/
    App.jsx
    index.css
    main.jsx
  database.sql
  eslint.config.js
  index.html
  package.json
  postcss.config.js
  tailwind.config.js
  vite.config.js
```

Key areas:

- `src/pages/` contains the home page, login, password reset, dashboard, space view, archive, recycle bin, and settings pages.
- `src/components/` contains reusable UI, item editors, layout shell, action menus, vault unlock gate, and space components.
- `src/context/` contains auth, encryption, theme, toast, shortcuts, command palette, and page action providers.
- `src/hooks/` contains data hooks for spaces, items, archive, recycle bin, global search, offline sync, and session timeout.
- `src/lib/crypto/` contains AES-GCM encryption, PBKDF2 key derivation, vault setup, vault unlock, session storage, PIN recovery code, and encoding helpers.
- `src/lib/` contains Supabase client setup, data protection helpers, import/export, offline queue, rate limiting, audit logging, and shared utilities.
- `database.sql` contains tables, indexes, RLS policies, triggers, RPC functions, realtime setup, vault recovery columns, and PIN lockout functions.
- `public/_headers` contains deployment headers for hosts such as Netlify and Cloudflare Pages.
- `vite.config.js` contains React, PWA, and manual chunk splitting configuration.

## Deployment notes

- Deploy the built `dist/` directory to a static host.
- Configure SPA fallback to `index.html`.
- Keep `dist/404.html` for hosts that need an SPA fallback file.
- Configure Supabase redirect URLs for `/login` and `/reset-password`.
- Rebuild after changing environment variables.
- Hard refresh after deploying PWA changes if a browser keeps an old service worker cache.

## Help & support

Need help setting up, self-hosting, or using Arche Space? Reach out at **[help@archespace.cc](mailto:help@archespace.cc)**.

Before emailing, it helps to include:
- What you were trying to do, and what happened instead.
- Your deployment type (single-user or multi-user), host, and browser.
- Any relevant console errors or Supabase logs (with secrets redacted).

For bugs and feature requests, you're also welcome to open an issue on the GitHub repository.

## Contributing & development

Contributions are welcome - bug fixes, features, docs, and translations.

- Fork the repository, create a feature branch, and open a pull request against `main`.
- Keep PRs focused and include a short description of the change and why it's needed.
- Run `npm run lint` and the test suite before submitting.
- For larger changes (new features, schema changes, security-relevant work), open an issue or reach out first so the approach can be discussed.

For development questions, architecture discussions, or anything related to contributing code, contact **[dev@archespace.cc](mailto:dev@archespace.cc)**.

## License

See [LICENSE](LICENSE).
