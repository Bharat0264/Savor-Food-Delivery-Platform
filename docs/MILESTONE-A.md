# Milestone A — merchant and branch management

This milestone keeps the existing premium customer and operational interfaces intact while moving merchant-management interactions into a typed, mock-backed domain service.

## Included

- Merchant registration creates a local pending application and a non-operating first branch.
- Super Admin workflows can approve, reject, suspend, and reactivate merchants.
- Merchant and Admin workspaces can select a merchant and its active branch.
- Branches support creation, address and availability updates, delivery availability, and seven-day business hours.
- Merchant managers can be created, activated or disabled, and scoped to one or more branches belonging to their merchant.
- Business profile changes, lifecycle changes, branch changes, and manager changes produce shared local audit events.
- Admin restaurant, grocery, and approval views now use the shared merchant-management service rather than directly mutating component state.

## Boundaries

This remains a browser-local development implementation. Its merchant-scope checks make workflow testing realistic, but are not a substitute for the Supabase RLS foundations retained in the repository. No cloud service, payment provider, map provider, or deployment was connected in this milestone.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (11 tests, including five merchant/branch service tests)
- `npm run build -- --webpack` — passed

The default Turbopack build is blocked in this execution environment because its CSS worker cannot bind an internal port. This is an environment limitation; the supported webpack build completed successfully.
