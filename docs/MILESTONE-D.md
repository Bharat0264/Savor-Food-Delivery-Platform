# Milestone D — order operations and delivery engine

This milestone adds a shared mock delivery-operations service without any external provider.

## State machine

`Pending → Accepted → Preparing → Ready`, followed by rider assignment and delivery states: `assigned → accepted → at_pickup → picked_up → at_destination → Delivered`. Merchant rejection cancels only pending/accepted orders. Rider and merchant identity checks gate every transition.

## Delivery controls

- Ready orders may be assigned only to an enabled, available rider belonging to the merchant with no active delivery.
- Only the assigned rider can accept, reach pickup, confirm pickup, arrive at destination, or verify delivery.
- OTPs expire after 30 minutes, permit three attempts, and are consumed after one successful completion.
- Every action creates shared order events, local notifications, and audit entries; completed riders become available again.

## Boundaries

Location/map behavior remains explicitly illustrative. Rider registration UI from earlier milestones remains browser-local. Cancellation/refund and settlement policies are intentionally not expanded into external financial operations.

## D.2 incremental completion

Central cancellation and refund operations now use the same delivery service. Customer cancellations are allowed only before preparation, cancellation is idempotent, eligible pre-preparation inventory is restored once, and paid orders support bounded simulated partial or full refunds in integer paise. These changes create separate refund records and local audit/notification events without rewriting original payment snapshots.

## D.2 Task B — rider management dashboards

Rider identities now retain contact and optional vehicle details independently from merchant memberships. The merchant and Super Admin delivery-partner directories both operate through `riderManagementService`: they support creation, profile changes, branch-scoped access, status filters, suspension/reactivation, archival, performance summaries, and membership history. The admin directory can explicitly add an existing rider to a second merchant; this creates a separate branch-scoped membership rather than duplicating identity data.

Suspending or archiving a membership is blocked while it owns an active delivery. Existing completed deliveries are preserved, and archived memberships remain visible in history. A rider with another active merchant membership remains enabled for that other merchant after one membership is archived. Rider availability changes are validated by the same service, and the rider app now displays active memberships/branches and rejects delivery actions outside an active authorized membership.

The browser persistence schema is version 4. Version-3 stored demo data is migrated through the existing seed-backed migration path so that newly required membership fields are restored without a destructive reset. This remains a browser-local demo; it is not authorization or multi-device synchronization.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (28 tests)
- `npm run build -- --webpack` — passed
- HTTP smoke checks — passed (`/merchant/riders`, `/rider`, `/admin/riders` all returned 200)

Browser visual automation was not available for this increment.
