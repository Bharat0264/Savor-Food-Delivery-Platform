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

## D.2 Task C — assignment, reassignment, and history

Delivery assignments are now separate persisted records, rather than being inferred only from `order.riderId`. Each record has a pending, accepted, declined, reassigned, cancelled, or completed state, timestamps, assigning actor, rider/merchant/branch scope, prior-assignment reference, and reason fields. `order.riderId` remains the current-delivery projection used by the existing screens.

An assignment reserves the rider's default capacity of one active delivery. Eligibility requires an enabled rider, active merchant membership, branch authorization, declared availability, capacity, and a ready non-terminal order. Declining, cancelling, completing, or replacing an assignment releases capacity. Historical assignments and assignment-event records are never overwritten.

Reassignment requires a reason. Before pickup, a merchant or Super Admin can replace an active rider atomically; the former rider loses operational access, the replacement receives a pending request, the OTP is rotated, and both assignment records remain visible. After pickup, ordinary reassignment is rejected. Only a Super Admin can execute the explicit custody-handover exception after confirming physical custody; that replacement is recorded as accepted so it can continue the in-flight delivery without falsely repeating pickup.

Merchant and Super Admin order details now show branch-eligible rider candidates, response state, assignment history, cancellation controls, and reason-based reassignment. The rider app exposes an assignment decline action. Browser persistence schema version 5 adds `assignments` and `assignmentEvents`; schema-4 demo data receives empty collections without resetting memberships, orders, payments, or refunds.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (33 tests)
- `npm run build -- --webpack` — passed
- HTTP smoke checks — passed (`/merchant/orders`, `/merchant/riders`, `/rider`, `/admin/orders`, and `/admin/riders` all returned 200)

Browser visual automation was not available for this increment.
