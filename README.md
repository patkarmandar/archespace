# Arche Space

Arche Space is an open source, private, encrypted space for organizing ideas, plans, notes, checklists, and cards. It is built as a self-hostable web app with Supabase sync and a client-side encrypted vault, ensuring that your saved content stays private even from the application owner and developers.

## Table of contents

- [Features](#features)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Security model](#security-model)
- [Setup](#setup)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Deployment notes](#deployment-notes)
- [Help and support](#help-and-support)
- [Contributing and development](#contributing-and-development)
- [Credits](#credits)
- [License](#license)

## Features

- Multiple spaces for separating ideas, projects, plans, references, and personal systems.
- Markdown notes for free-form writing.
- Checklists for tasks, routines, and progress tracking.
- Menu-style lists for lightweight structured information.
- Cards with title and description fields for planning and grouping ideas.
- Pinning for important spaces and items.
- Drag-and-drop reordering for spaces and page items.
- Unified dashboard search across spaces, tags, and item content.
- Command palette with `Ctrl+K` / `Cmd+K`.
- Bulk actions for spaces and items.
- Duplicate, move, archive, restore, and delete workflows.
- Recycle bin with restore and permanent delete.
- Archive area for hiding content without deleting it.
- Auto-save for edited items.
- Backup import/export to JSON.
- Private, encrypted vault to keep your content secure (see [Security model](#security-model)).
- Appearance settings with `System`, `Dark`, and `Light` theme modes.
- Accent color settings with multiple color options.
- Single-user self-hosting mode by default, with an optional multi-user mode.
- Offline queue for pending changes while the browser is offline.
- PWA support for installing as an app.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Focus dashboard search |
| `N` | Create a new space on the dashboard |
| `Ctrl+S` / `Cmd+S` | Save all dirty items on the current page |
| `Esc` | Close menus, modals, or active overlays |

## Security model

Arche Space uses a browser-side vault model. You sign in with Supabase Auth using a login password, then unlock a separate vault PIN to access encrypted data - the password proves account ownership, the PIN protects the content itself.

**Encryption**

- Space and item content (names, descriptions, tags, titles, and content) is encrypted client-side with AES-GCM before it reaches Supabase. Only non-sensitive metadata - IDs, timestamps, positions, and flags like pinned/archived/deleted - stays in plain form.
- The vault PIN is never stored as plaintext. On setup, the browser generates a random vault master key, which is wrapped using a PIN-derived key from PBKDF2.
- Because encryption happens client-side, stored content is not readable by developers or app owners from the database.

**Sessions and access**

- The unlocked vault key lives only in browser session storage and auto-locks after 24 hours.
- The login session has an absolute lifetime of 1 week.
- Password reset and password change flows globally sign out existing sessions.
- Vault PIN failed attempts are rate limited and locked after repeated failures.
- Supabase Row Level Security restricts each user to their own rows.

**Recovery**

- A one-time recovery code is generated during initial vault setup and shown once in the app - it is not emailed, so it must be saved when shown.
- The recovery code can be recreated from Settings by entering the current vault PIN.
- If the PIN is forgotten, the "Forgot PIN" flow uses the recovery code to set a new vault PIN.
- Resetting with a recovery code generates a new recovery code and invalidates the previous one.

**Limits to be aware of**

- The app cannot recover encrypted content without either the current vault PIN or the current recovery code - there's no backdoor.
- If both the vault PIN and recovery code are lost, encrypted space data cannot be decrypted.
- JSON exports are downloaded to your machine and should be stored carefully; imported backups are encrypted before upload.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/patkarmandar/Arche
cd Arche
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create and configure a Supabase project

1. Create a Supabase project.
2. Run the full `schema.sql` file in the Supabase SQL Editor.
3. Enable the Email provider in Supabase Auth.
4. Configure Resend as the SMTP server in Supabase Auth for password reset and auth emails.
5. Add your deployed app URL to Supabase Auth redirect URLs.
6. Add `https://your-domain/reset-password` to Supabase Auth redirect URLs for password reset links.
7. Keep Supabase Auth sign-in rate limits at `30/hour per IP` or lower for production.

### 4. Configure environment variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Choose single-user or multi-user mode

**Single-user mode** is the default - create one user in the Supabase Auth dashboard and keep public sign-up disabled.

**Multi-user mode** is optional. To enable it:

```env
VITE_ALLOW_SIGNUP=true
```

or:

```env
VITE_MULTI_USER=true
```

Also enable Supabase Auth email sign-ups, tighten sign-up and password-reset rate limits, and verify RLS policies before public deployment.

### 6. Run the app

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

### Upgrading an existing deployment

- Re-run `schema.sql` on older deployments to add vault recovery, PIN lockout, and user settings tables/columns.
- Run `NOTIFY pgrst, 'reload schema';` after database changes if the Supabase schema cache does not refresh immediately.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7 |
| Build tooling | Vite 8, Vite PWA plugin (`vite-plugin-pwa`) |
| Styling | Tailwind CSS 3, CSS custom properties (theme mode and accent colors) |
| Data fetching / caching | TanStack Query 5 |
| Backend | Supabase Auth, Supabase PostgreSQL, Supabase Row Level Security, Supabase Realtime |
| Email delivery | Resend SMTP (via Supabase Auth) |
| Encryption | Web Crypto API |
| Icons | Lucide React |
| File handling | JSZip |
| Linting | ESLint 10 |

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
  schema.sql
  eslint.config.js
  index.html
  package.json
  postcss.config.js
  tailwind.config.js
  vite.config.js
```

Key areas:

- `src/pages/` contains the public home page, login, password reset, dashboard, space view, archive, recycle bin, and settings pages.
- `src/components/` contains reusable UI, item editors, layout shell, action menus, vault unlock gate, and space components.
- `src/components/editors/` contains note, checklist, list, and card editors, including drag-handle item reordering.
- `src/context/` contains auth, encryption, appearance/theme, toast, shortcuts, command palette, and page action providers.
- `src/hooks/` contains data hooks for spaces, items, archive, recycle bin, global search, offline sync, drag reordering, and session timeout.
- `src/lib/crypto/` contains AES-GCM encryption, PBKDF2 key derivation, vault setup, vault unlock, session storage, PIN recovery code, and encoding helpers.
- `src/lib/` contains Supabase client setup, data protection helpers, import/export, offline queue, rate limiting, audit logging, password policy, and shared utilities.
- `schema.sql` contains tables, indexes, RLS policies, triggers, RPC functions, realtime setup, vault recovery columns, user settings, and PIN lockout functions.
- `public/_headers` contains deployment headers for hosts such as Netlify and Cloudflare Pages.
- `vite.config.js` contains React, PWA, and manual chunk splitting configuration.

## Deployment notes

- Deploy the built `dist/` directory to a static host.
- Configure SPA fallback to `index.html`.
- Keep `dist/404.html` for hosts that need an SPA fallback file.
- Configure Supabase redirect URLs for `/login` and `/reset-password`.
- Configure Resend SMTP in Supabase Auth before relying on password reset emails.
- Run the latest `schema.sql` before deploying app versions that use vault recovery or account appearance settings.
- Rebuild after changing environment variables.
- Hard refresh after deploying PWA changes if a browser keeps an old service worker cache.

## Help and support

Need help setting up, self-hosting, logging in, password recovery, vault PIN recovery, or using Arche Space? Reach out at **[help@archespace.cc](mailto:help@archespace.cc)**.

Before emailing, it helps to include:

- What you were trying to do, and what happened instead.
- Your deployment type, such as single-user or multi-user.
- Your hosting provider.
- Your browser and operating system.
- Any relevant console errors or Supabase logs with secrets redacted.

For bugs and feature requests, you can also open an issue on the GitHub repository.

## Contributing and development

Contributions are welcome, including bug fixes, features, docs, and translations.

- Fork the repository, create a feature branch, and open a pull request against `main`.
- Keep PRs focused and include a short description of the change and why it is needed.
- Run `npm run lint` before submitting.
- Run `npm run build` before submitting.
- For larger changes, schema changes, or security-relevant work, open an issue or reach out first so the approach can be discussed.

For development questions, architecture discussions, feature requests, bug reports, or anything related to contributing code, contact **[dev@archespace.cc](mailto:dev@archespace.cc)**.

## Credits

- Built with React, Vite, Tailwind CSS, Supabase, TanStack Query, Lucide, JSZip, and the Web Crypto API.
- Email delivery for Supabase Auth flows is intended to be handled through Resend SMTP.
- Created and maintained by the Arche Space project.

## License

See [LICENSE](LICENSE).
