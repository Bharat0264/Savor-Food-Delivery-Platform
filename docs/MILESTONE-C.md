# Milestone C — cart, checkout, and order creation

Milestone C replaces the legacy rupee-unit cart/order snapshots with a paise-authoritative commerce domain. It is entirely local and mock-backed; no payment, mapping, storage, authentication, or database provider is connected.

## Money migration

`schemaVersion: 3` identifies persisted state using integer paise for every cart line, order total, refund, payment record, and settlement projection. `migrateDemoState` upgrades older browser data only when its schema version is below 3. Legacy rupee values are multiplied by 100 exactly once, and a subsequent reload is a no-op. Catalog `pricePaise`, variants, and add-ons remain authoritative.

The legacy `Product.price` field remains only as a temporary catalog-management compatibility projection. It is not used for cart, checkout, payment, or order calculations.

## Services

- `cartService`: normalized product/variant/add-on selection, configuration identity merging, quantity validation, one-merchant/one-branch enforcement, removal, and revalidation.
- `addressService`: typed Indian-address validation, default handling, deletion guard, and deterministic Bengaluru/PIN serviceability rule.
- `quoteCart`: trusted paise-based subtotal, demo delivery fee, eligible promotion, and final total calculation.
- `checkoutService`: idempotency, availability/serviceability/price/inventory checks, deterministic simulated payment outcomes, immutable order snapshots, successful-payment inventory deduction, local events, and cart clearing.

## Checkout policies

- Customer-facing delivery is an explicitly labeled ₹40 demo fixture; tax is zero until real policy configuration.
- `FIRSTBITE` is a fixed ₹100 food promo on ₹499+ eligible subtotal. Discounts can never exceed subtotal.
- A failed or pending simulated payment records only a payment attempt: it does not create an order or reserve/deduct stock.
- A confirmed simulated payment creates a pending merchant-visible order atomically, deducts branch inventory once, clears the cart, and writes a notification/audit event.
- Existing order line snapshots never change when a product is subsequently edited.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (21 tests)
- `npm run build -- --webpack` — passed

Browser automation was unavailable, so visual browser testing is not claimed. Cross-tab browser storage updates are supported by the existing provider; true cross-device/user realtime requires the later backend stage.
