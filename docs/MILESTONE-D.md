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

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (23 tests)
- `npm run build -- --webpack` — passed
