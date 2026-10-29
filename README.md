# Savor — Phase 1 marketplace frontend

A local-first food and grocery marketplace built with Next.js App Router, TypeScript, Tailwind CSS 4, Three.js / React Three Fiber / Drei, GSAP ScrollTrigger, Motion, Lucide and Recharts. Supabase Auth and PostgreSQL foundations are present but require project credentials and migration application; payments, maps, storage, realtime and notifications are not connected yet.

Phase 2 Stage 1 adds a Supabase schema migration and genuine Auth client foundation without changing the Phase 1 data provider yet. Read [the Stage 1 setup guide](docs/PHASE2-STAGE1.md) before configuring credentials. Database access remains deny-by-default until Stage 2 RLS policies are applied.

Phase 2 Stage 2 adds database-backed role helpers, least-privilege grants, RLS policies, protected route handling and a role-aware sign-in path. Read [the Stage 2 security guide](docs/PHASE2-STAGE2.md) before applying either migration to a development project.

Milestone A returns the app to its local-first coding track: merchant registration, approval, suspension, multi-branch management, branch-scoped manager access, business hours, and shared local audit events now flow through a typed domain service. Read [the Milestone A implementation note](docs/MILESTONE-A.md).

Milestone B adds typed, branch-aware catalog and inventory management with paise-based catalog prices, variants, add-ons, mock media metadata, and customer storefront synchronization. Read [the Milestone B implementation note](docs/MILESTONE-B.md).

Milestone C makes cart, checkout, mock payments, order snapshots, and inventory deduction paise-authoritative with a safe browser-state migration. Read [the Milestone C implementation note](docs/MILESTONE-C.md).

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. This origin avoids service-worker caches that another local project may have registered on `localhost:3000`.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm start
```

Dependencies are pinned and `package-lock.json` is included. The persistent development role switcher gives access to all four experiences. Reset returns browser state to deterministic fixtures.

## Source structure

```text
src/app/
  [[...slug]]/page.tsx    App Router entry, route segments passed to typed UI
  layout.tsx            Brand tokens, metadata and shared provider
  globals.css           Tailwind import, design system, responsive rules
  loading.tsx           Loading state
  error.tsx             Recoverable rendering error state
  icon.svg              Original brand mark
src/components/
  app.tsx               Route-to-screen composition, lazy operational bundles
  shell.tsx             Customer shell, role-specific mobile nav, demo controls
  home.tsx              Editorial homepage and GSAP choreography
  scene.tsx             Procedural WebGL bowl, instanced rice, ingredients
  scene-boundary.tsx    WebGL error fallback
  discovery.tsx         Food / grocery merchant discovery and sorting
  store.tsx             Merchant catalog, customization, bag replacement
  checkout.tsx          Cart, address, promo, demo payment and order placement
  cart-editor.tsx       In-bag product customization
  account.tsx           Profile, addresses, history, favorites, support, tracking
  operations.tsx        Merchant/admin workspaces and analytics
  merchant-management.tsx Merchant/branch profile and manager controls
  catalog-management.tsx Merchant/admin catalog, inventory and product controls
  order-management.tsx Order table, assignment and product editor
  finance.tsx           Simulated ledger, settlements and refunds
  rider-management.tsx Rider creation, availability and memberships
  rider.tsx             Mobile delivery workflow and OTP completion
  provider.tsx          Shared React state, persistence and cross-tab updates
  ui.tsx                Accessible dialogs, merchant cards and empty states
src/lib/
  brand.ts              Configurable identity, core colors and currency
  copy.ts               Brand-facing editorial copy
  model.ts              Typed domain entities
  seed.ts               Deterministic Indian merchant/product/order fixtures
  repository.ts         Persistence and validated cart/order state transitions
  selectors.ts          Derived financial, review, customer and membership views
  services/             Typed mock domain services and future adapter seam
public/                 Local photographs, licensed fonts
tests/                 State-flow and invariant tests
docs/                  Demo walkthrough, asset provenance and verification
```

## Implemented routes

| Experience | Routes |
| --- | --- |
| Customer discovery | `/`, `/food`, `/grocery`, `/offers` |
| Catalog and checkout | `/store/m1` through `/store/m6`, `/cart`, `/checkout` |
| Tracking | `/orders/[orderId]` |
| Customer account | `/account`, `/account/profile`, `/account/addresses`, `/account/orders`, `/account/favorites`, `/account/notifications`, `/account/help`, `/account/settings` |
| Merchant | `/merchant`, `/merchant/orders`, `/merchant/products`, `/merchant/riders`, `/merchant/branches`, `/merchant/earnings`, `/merchant/settlements`, `/merchant/settings` |
| Rider | `/rider`, `/rider/completed`, `/rider/earnings`, `/rider/profile` |
| Super Admin | `/admin`, `/admin/analytics`, `/admin/orders`, `/admin/restaurants`, `/admin/stores`, `/admin/approvals`, `/admin/branches`, `/admin/customers`, `/admin/riders`, `/admin/products`, `/admin/payments`, `/admin/balances`, `/admin/settlements`, `/admin/deductions`, `/admin/refunds`, `/admin/promotions`, `/admin/notifications`, `/admin/support`, `/admin/audit`, `/admin/settings` |

## Design and motion

Ivory, aubergine and lime with self-hosted DM Sans, editorial serif accents, local photography, frosted hero labels, and separate dark operational surfaces. The hero is a real procedural Three.js composition with a ceramic bowl, rice instances, vegetables, rounded tofu pieces, float motion, pointer camera movement, soft contact shadows and a GSAP entrance. ScrollTrigger controls reveals, hero depth/rotation and photo masking. Motion handles headline entrance, route transitions, add-button feedback and confirmation.

WebGL is dynamically loaded, capped at 1.5 DPR and unmounted outside the hero viewport. Reduced-motion users receive a photography fallback, no GSAP sequences and disabled CSS animation. A scene error boundary provides a static fallback. Forms have labels, dialogs use native modal focus behavior, and navigation includes a skip link and mobile role-specific controls.

## Functional demo

The same order travels through checkout, merchant acceptance/preparation/assignment, rider pickup and OTP delivery, customer history/review, and admin reporting. Single-merchant carts require confirmation before replacement. Stock checks aggregate variants, rider assignments enforce membership and prevent double-booking, and cancellation restocks at most once. Shared data persists in browser storage; multiple tabs on the same origin synchronize changes.

Additional interactions: search/filter/sort, catalog category ordering, variants, add-ons, branch pricing, stock warnings and inventory adjustments, favorites, cart customization, addresses, profile edits, promos, simulated payment failures, support cases, merchant registration/approval/suspension, multi-branch management, branch-scoped manager assignment, rider registration/disable/removal, reassignment, notification read state, demo refunds, and CSV statements.

Follow [the complete walkthrough](docs/DEMO-WALKTHROUGH.md).

## Financial simulation

Payments, refunds and T+2 records are clearly marked simulated. Deduction rules remain **Not configured**; net balances and rider compensation are **Not calculated**. No production commission, tax, payout or delivery compensation is invented. T+2 uses illustrative calendar-day offsets from fixture order timestamps, not a banking-day scheduler. Demo delivery has an explicit ₹40 fixture charge; the promo fixture is ₹100 off a subtotal of ₹499 or more.

## Vercel deployment

No deployment has been performed. When authorized:

1. Put this directory in a Git repository and push it to your chosen Git provider.
2. Import the repository into Vercel and select the Next.js framework preset.
3. Use Node.js 24, install command `npm ci`, build command `npm run build`, and the default Next.js output directory.
4. No environment variables or paid integrations are needed for this phase.
5. Deploy a preview and run the walkthrough on that preview origin before promoting it. Browser storage is separate for every origin.

## Limits and remaining work

This is a frontend demonstration, not a secure multi-user system. Roles and merchant selection are explicit development tools. Data is browser-local, and cross-device synchronization, real OTP security, realtime delivery updates, contact calls/messages, actual payments/refunds, bank statements and payouts belong to Phase 2.

Catalog photography is illustrative and reused for some dishes. The 3D scene is stylized procedural art, not a scanned food model. Brand identity, primary theme tokens and editorial copy are centralized; operational labels remain beside their workflow components rather than a full localization catalog.

Do not treat the product as launch-approved until the outstanding browser/device checks in [verification](docs/VERIFICATION.md) have passed, real merchandising assets are supplied, and Phase 2 authorization and services are implemented.
