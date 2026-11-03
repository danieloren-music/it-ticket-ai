# SmartQ – AI service desk

Multi-tenant IT service desk. An employee describes a problem in plain language, **Tony** (Google Gemini) turns it into a classified, prioritized and routed ticket, and IT staff work it from a live queue with SLA tracking.

**Live:** https://smartq-ai.vercel.app/home  ·  Try the full product without signing up from the home page ("Try SmartQ").

## Stack
Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase (Postgres) · Google Gemini · OIDC (`openid-client`) · SAML 2.0 (`@node-saml/node-saml`) · Vercel

## Architecture

```
Browser ──► Next.js (Vercel) ──► Supabase (service-role key, RLS deny-all for anon)
              │  proxy: verifies signed session cookie, role-based page access
              │  /api/*    : every route re-checks session + role + tenant on the server
              └► Google Gemini (logged-in ticket assistant)
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
- **Tenant isolation**: every protected page must match the signed session's tenant; every tenant API query and write is scoped to the tenant ID from that session. Ticket history is also scoped by tenant and reporter. The database is accessed only by the server (service-role key); RLS denies direct access using public `anon`/`authenticated` keys (`supabase/migrations/002_enable_rls.sql`).
- **RBAC** enforced in the API (`requireTenant` / `requirePlatform`), not only in the UI. Employees only see their own tickets; internal notes are staff-only.
- **OIDC and SAML**: each organization can enable either or both. OIDC uses Authorization Code + PKCE, validates issuer/state/nonce/signature via `openid-client`, restricts server-side discovery/token fetches to HTTPS public endpoints, and encrypts tenant-owned client secrets with AES-256-GCM. SAML assertions are signature/audience/validity checked against the organization's IdP certificate. Both require an active local SmartQ account; roles come from the organization's user directory, not Entra group assignment.
- **Hardening**: same-origin check on all mutations, rate limiting, input validation/length caps, audit log, security headers, honeypot on the contact form.
- **Public chat simulation and demo workspace** use scripted replies and rule-based classification; they do not call Gemini. The home-page chat does not create real tickets; the separate demo workspace remains isolated from customer sessions.
- **Contact form** stores requests in Supabase and sends a notification through Resend.

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill it in (see comments).
3. Run the read-only inventory `supabase/maintenance/001_review_database.sql`; confirm the base tables exist (`001_enterprise.sql` does not create a fresh database schema).
4. Take a restorable backup, then run `supabase/migrations/001_enterprise.sql` and `supabase/migrations/003_oidc_sso.sql` in Supabase SQL Editor.
5. Set the same variables in Vercel, **including `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `IDP_ENCRYPTION_KEY`**, and configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CONTACT_TO_EMAIL` for contact notifications, then deploy.
6. Sign in at `/platform/login` with `PLATFORM_BOOTSTRAP_EMAIL/PASSWORD`, create a permanent platform user, then remove the bootstrap variables.
7. After verifying sign-in works, run `supabase/migrations/002_enable_rls.sql`.
8. For database inventory and explicitly approved, guarded cleanup, see `supabase/maintenance/`. Review and back up before dropping any table.

`npm run dev` · `npm run build` · `npm run typecheck`

For tenant onboarding, production configuration, Hebrew/RTL checks, and Entra/OIDC/SAML setup, see [docs/HEBREW-ENTERPRISE-SETUP.md](docs/HEBREW-ENTERPRISE-SETUP.md).

## Health check
`GET /api/health` → `{ status, database, latency_ms }` for uptime monitors.
