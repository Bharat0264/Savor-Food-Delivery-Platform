# Shared-state demonstration

Use one browser origin. The development switcher remains visible at the bottom. These are demo identities, never real authentication. The state is shared across role routes and synchronized between tabs through browser storage events.

1. Open `/food`, select **The Good Bowl**, and add a regular **Sesame sunshine bowl**.
2. Open the bag. Change quantity to 2. Apply `FIRSTBITE` for ₹100 off a subtotal of at least ₹499. Select an address, instructions and Demo UPI.
3. Optionally check **Test a payment failure** and submit: the failure message must appear and the cart must remain intact. Uncheck it and place the demo order.
4. Record the new order ID and delivery OTP shown on its tracking page. There is no money movement.
5. Switch to **Merchant view**. Select **The Good Bowl**, open Orders, and accept that ID. Then **Start preparing**, then **Mark ready**.
6. Open the order ID. Select **Arjun Kumar** as delivery partner. Only enabled, associated, non-offline riders are offered. A rider with another active assignment cannot be double-booked.
7. Switch to **Delivery partner** and choose Arjun Kumar. Confirm pickup. The shared customer timeline moves to Out for delivery.
8. Enter an incorrect OTP to test rejection. Enter the customer's correct OTP and complete the delivery. Arjun returns to Available.
9. Return to `/account/orders`, open that ID, and submit a rating and feedback.
10. Switch to **Super admin**. The same order, product inventory, payment fixture, settlement eligibility and audit activity are visible.

## Additional checks

- Add an item from The Good Bowl, then try Fresh Field. A modal asks whether to replace the existing merchant-specific bag. Cancel retains it; confirm replaces it.
- Fresh Field supports Standard and Family pack fixtures. Product stock and prices can be edited from its merchant workspace.
- Pause a merchant in Business settings; its checkout is rejected. Global ordering can also be paused from admin settings.
- Add a delivery partner, disable/enable them, and remove their membership after active assignments have been reassigned.
- Create a customer support request and resolve it in Admin → Support cases.
- Pause FIRSTBITE in Admin → Promotions; checkout no longer grants that discount.
- Admin → Refunds records an illustrative full refund without changing delivered inventory or moving money.
- Admin → Settlements exports a CSV. Deduction and net amounts remain Not configured / Not calculated.
- Reset demo data returns all browser fixtures to their deterministic seed. It discards local demo changes.

## Phase 2 boundary

`src/lib/repository.ts` contains persistence and tested order/cart transitions; `selectors.ts` derives payment, settlement, review, customer, manager and membership views. `Provider` is the only shared React state boundary. Replace that boundary and repository implementation with authenticated, asynchronous backend services; keep presentation components and typed models.

Never reuse the development role switcher or client-side membership checks as production authorization. The eventual backend must own identity, authorization, inventory reservations, order state transitions, OTP security, price calculation, financial ledgers and audit records.
