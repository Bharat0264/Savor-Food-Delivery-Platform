# Phase 2, Stage 1 — Supabase foundation and authentication

## What changed

The existing application is a client-rendered App Router shell. Its `Provider` and `repository.ts` currently own all fixture data and mutations. Stage 1 leaves that adapter in place so the Phase 1 cinematic experience remains intact, then adds an independent production foundation:

- `supabase/migrations/20261029000100_foundation.sql` creates normalized identity, merchant, branch, rider, catalog, commerce, delivery, support, finance, audit and settlement tables.
- All monetary fields use integer minor units and all persisted timestamps are `timestamptz`.
- PostGIS geography/geometry fields and spatial indexes are ready for the map stage.
- RLS is enabled on every application table with no permissive policies. That is intentionally deny-by-default until Stage 2 adds explicit role policies. It is safe for this stage because no production data reads or writes have been wired to these tables yet.
- A trigger creates a profile, customer account and customer role whenever Supabase Auth creates a user. The browser cannot grant privileged roles.
- `private.bootstrap_super_admin(uuid)` is a one-time, SQL-owner-only setup function; it is not exposed through the Data API and public execution is revoked.
- `@supabase/ssr` adds cookie-based, PKCE-compatible browser/server clients, a Next 16 `proxy.ts` session refresher, a verified callback route, and the `/auth` UI. The proxy uses `getClaims()`, not an unverified cookie session.

## Local setup

1. Install Docker Desktop, start it, then run `npx supabase start`.
2. Copy `.env.example` to `.env.local` and fill only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the local or hosted project. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; Stage 1 does not consume it.
3. Apply the checked-in migration and seed with `npx supabase db reset`.
4. Start the site with `npm run dev`, create a customer at `/auth`, and confirm the email through the local Mailpit or hosted Supabase Auth flow.
5. To create the first administrator, use the protected SQL editor as the project owner after the target user has a profile:

   ```sql
   select private.bootstrap_super_admin('AUTH_USER_UUID');
   ```

   This function succeeds exactly once. Do not call it from the browser, an API route, or a client-side migration.

6. For a hosted project, install the CLI, `supabase login`, `supabase link --project-ref <ref>`, review migrations, and use `supabase db push`. Set Supabase Auth Site URL and redirect allow-list to the exact Vercel preview/production origins before enabling email confirmation.

## Validation

Run these checks after Docker is available:

```sh
npx supabase db reset
npx supabase test db
npm run lint
npm run typecheck
npm test
npm run build
```

`supabase/tests/foundation.test.sql` validates the key tables, identity keys, minor-unit totals and merchant order index. Stage 2 will add RLS isolation tests after policies are introduced.

## Deliberate stage boundary

There is no configured Supabase project, credential, Docker daemon, or database in this workspace. Therefore migrations and genuine Auth wiring are present, but neither has been applied to a remote project or tested against a live Auth provider. The site remains usable with its local Phase 1 fixtures when public Supabase variables are absent. No production role switching is rendered; the development-only role switcher remains available only under `NODE_ENV=development`.

The next stage is role-based policies and server-side authorization. It must be completed before any merchant, order, delivery, payment, or financial mutation uses this database.
