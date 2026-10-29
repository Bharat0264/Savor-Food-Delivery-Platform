# Milestone B — catalog and inventory management

Milestone B extends the shared browser-local demo state with a typed catalog domain. It preserves the existing Three.js hero, GSAP motion, customer storefront layout, and operational visual language.

## Implemented

- Menu and grocery categories with creation, renaming, and ordering.
- Restaurant and grocery product creation/editing, descriptions, local sample-image selection, archival, availability, vegetarian flags, and preparation times.
- Variants and pack sizes with paise-based selling prices; grocery MRP validation prevents a selling price above MRP.
- Food customization groups, optional/required add-ons, and min/max selection validation.
- Per-branch catalog overrides for availability and pricing.
- Per-branch inventory, low-stock thresholds, availability state, safe stock adjustments, and adjustment history.
- Merchant/branch-scoped demo authorization checks; Super Admin overrides are recorded in catalog audit history.
- A mock media adapter for local image metadata only. It accepts local public image URLs, validates image MIME type and a 5 MB size limit, and does not upload anything to cloud storage.
- Customer product detail dialogs now render actual catalog variants and add-ons, calculate prices from paise values, validate required selections, and hide archived products.

## Money and compatibility

Catalog prices are stored as integer paise in `pricePaise`, `mrpPaise`, variants, add-ons, and branch overrides. The existing checkout/cart demonstration intentionally remains on its legacy rupee-unit cart snapshot until Milestone C replaces it with a fully paise-based checkout/order contract. Catalog projections convert paise only at that compatibility boundary.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (19 tests)
- `npm run build -- --webpack` — passed

Browser automation was unavailable in the execution environment, so no visual-browser claim is made. No Supabase connection, cloud storage, payment, maps, notifications, deployment, or other external integration was used.
