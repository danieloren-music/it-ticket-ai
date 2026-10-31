# SmartQ – AI service desk

Multi-tenant IT service desk. An employee describes a problem in plain language, **Tony** (Google Gemini) turns it into a classified, prioritized and routed ticket, and IT staff work it from a live queue with SLA tracking.

**Live:** https://smartq-ai.vercel.app/home  ·  Try the full product without signing up from the home page ("Try SmartQ").

## Stack
Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · Google Gemini · SAML 2.0 (`@node-saml/node-saml`) · Vercel

## Architecture

```
Browser ──► Next.js (Vercel) ──► Supabase (service-role key, RLS deny-all for anon)
              │  middleware: verifies signed session cookie, role-based page access
              │  /api/*    : every route re-checks session + role + tenant on the server
              └► Google Gemini (ticket assistant, public demo classifier)
```

| Area | Route | Who |
|---|---|---|
| Marketing + live demo | `/home` | public |
| Tenant login | `/{tenant}/login` | public |
| New request (Tony) | `/{tenant}/self-service` | employee, technician, manager |
| Service queue | `/{tenant}/admins` | technician, manager |
| Administration | `/{tenant}/manage` | manager |
| Vendor console | `/platform` | SmartQ staff |
| Public sandbox org | `/demo/*` via "Try SmartQ" | anyone (restricted, resets every 24h) |

### Security model
- **Sessions**: HMAC-SHA256 signed, `httpOnly`, `SameSite=Lax`, `Secure` cookies (`SESSION_SECRET`). The browser can no longer forge or read them.
- **Passwords**: scrypt hashes. Legacy plaintext rows are upgraded transparently on next login. No shared/backdoor password. New users get a one-time temporary password and must change it at first sign-in. Accounts lock for 15 min after 5 failures.
- **Tenant isolation**: the tenant always comes from the signed session. The database is accessed only by the server (service-role key); RLS denies the public `anon` key entirely (`supabase/migrations/002_enable_rls.sql`).
- **RBAC** enforced in the API (`requireTenant` / `requirePlatform`), not only in the UI. Employees only see their own tickets; internal notes are staff-only.
- **SAML**: assertion signature, audience and validity are verified against the tenant's IdP certificate; `RelayState` is HMAC-signed; role mapped from Entra group IDs.
- **Hardening**: same-origin check on all mutations, rate limiting, input validation/length caps, audit log, security headers, honeypot on the contact form.
- **Public demo** is rate limited, read-only for user administration/SSO, and has a daily AI budget guard.

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill it in (see comments).
3. Supabase → SQL Editor: run `supabase/migrations/001_enterprise.sql`.
4. Set the same variables in Vercel, **including `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET`**, then redeploy.
5. Sign in at `/platform/login` with `PLATFORM_BOOTSTRAP_EMAIL/PASSWORD`, create a permanent platform user, then (optional) remove the bootstrap variables.
6. After verifying sign-in works, run `supabase/migrations/002_enable_rls.sql`.

`npm run dev` · `npm run build` · `npm run typecheck`

## Health check
`GET /api/health` → `{ status, database, latency_ms }` for uptime monitors.
