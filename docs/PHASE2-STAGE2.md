# Phase 2, Stage 2 — secure roles and Row Level Security

## Runtime validation status

Stage 1 was inspected before this work. This workspace has no Docker, OrbStack, Podman, PostgreSQL client, `.env.local`, linked Supabase development project, or Supabase credentials. No migration was applied and no database was reset. The Stage 1 runtime checks, Auth sign-up/sign-in/logout flow, trigger execution, extension creation, and the pgTAP suite remain **unexecuted**.

Do not run the commands below against a production project. Use a local Supabase stack or an explicitly designated disposable development project.

## Migration

`supabase/migrations/20261029000200_rbac_rls.sql` adds:

- Trusted, fixed-search-path private SQL helpers: `is_super_admin`, `is_merchant_owner`, `can_manage_merchant`, `can_manage_branch`, `can_manage_riders`, `can_view_order`, `can_assign_delivery`, and `can_view_settlement`.
- Branch-scoped order and inventory checks. Merchant owners have merchant-wide branch access; managers require an explicit `branch_members` record for branch operations.
- Rider membership protection that prevents a merchant manager from attaching a rider who already belongs to another active merchant. Only Super Admin can make that cross-merchant exception.
- Explicit grants plus RLS policies. Anonymous users can read only approved catalog data. Private identity, commerce, delivery, notifications, finance, and audit data require an authenticated, policy-authorized caller.
- No client grants to roles, merchant staff memberships, payments, payment events, order creation/status changes, refunds, ledger writes, settlement writes, payouts, or audit writes.
- Read-only finance access for the owning merchant’s owner, manager, or finance viewer, plus Super Admin. Sensitive financial mutations remain unavailable to browser clients for their later controlled workflows.
- A `security_invoker` delivery-tracking view that excludes delivery OTP hash and attempt fields.
- Audit triggers for sensitive merchant, membership, catalog, and inventory changes.

`private` is outside the project’s exposed API schemas. Its role-check helpers are executable by Data API roles only so PostgreSQL can evaluate policies; the privileged bootstrap, trigger, and audit functions are explicitly not executable by them.

## Application authentication behavior

- `getAuthorizationContext()` verifies session claims server-side, then reads only RLS-permitted role and membership records.
- `/account`, `/cart`, `/checkout`, `/orders`, `/merchant`, `/rider`, and `/admin` are guarded in the App Router entry. A missing or expired verified session redirects to `/auth`; insufficient membership redirects to `/unauthorized`.
- Login redirects by trusted roles: Super Admin, rider, merchant, or customer. A user with multiple merchant memberships is sent to `/merchant/select` instead of receiving a merged permission set.
- The callback rejects `//` redirect targets. Logout clears the Supabase session before routing to `/auth`.
- With no public Supabase configuration, mock fixtures remain available only in development. Production private routes redirect to configuration/sign-in; the role switcher is never rendered in production or when Supabase is configured.

## Database test setup

The RLS test uses Supabase’s documented `basejump-supabase_test_helpers` package to create real `auth.users` fixtures and switch claims. In an isolated local database only, install it once:

```sql
create extension if not exists pgtap with schema extensions;
select dbdev.install('basejump-supabase_test_helpers');
create extension if not exists "basejump-supabase_test_helpers" version '0.0.6';
```

Then run:

```sh
npx supabase start
npx supabase db reset
npx supabase test db
npm run lint
npm run typecheck
npm test
npm run build
```

`001_rbac_rls.test.sql` covers the Auth profile trigger, one-time admin bootstrap, customer isolation, merchant/catalog isolation, branch isolation, cross-merchant rider attachment rejection, rider delivery isolation, anonymous denial, Super Admin reads, financial and role-edit denial, immediate loss of access after disabling a membership, the delivery view, and schema RLS coverage.

## Remaining before Stage 3

Apply and pass migrations/tests in an isolated database, then exercise actual email confirmation, password login, logout, callback cookie refresh, expiry, and role routing with real development credentials. Stage 3 must use the new RLS helpers and server-side order transaction rather than the local Phase 1 repository. No ordering, payment, payout, map, notification, or production settlement integration was added here.
