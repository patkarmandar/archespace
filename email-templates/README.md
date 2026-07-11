# Arche Space email templates

Paste the HTML into **Supabase Dashboard → Authentication → Email Templates**.

## Native Supabase templates

| File | Supabase template | Variables used | Suggested subject |
|------|-------------------|----------------|-------------------|
| `confirm-signup.html` | Confirm signup | `{{ .ConfirmationURL }}` | Confirm your Arche Space email |
| `invite-user.html` | Invite user | `{{ .ConfirmationURL }}` | You're invited to Arche Space |
| `magic-link.html` | Magic Link | `{{ .ConfirmationURL }}`, `{{ .Token }}` | Your Arche Space sign in link |
| `change-email.html` | Change Email Address | `{{ .ConfirmationURL }}`, `{{ .NewEmail }}` | Confirm your new Arche Space email |
| `reset-password.html` | Reset Password | `{{ .ConfirmationURL }}` | Reset your Arche Space password |
| `reauthentication.html` | Reauthentication | `{{ .Token }}` | Confirm it's you |
| `password-changed.html` | Password Changed | — | Your Arche Space password was changed |
| `email-changed.html` | Email Changed | `{{ .NewEmail }}` | Your Arche Space email was changed |

The last two are notification-only (no action link); Supabase sends them
automatically after the corresponding change.
