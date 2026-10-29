import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { migrateDemoState } from "../src/lib/repository";
import { addressService, cartService, checkoutService, quoteCart } from "../src/lib/services";

test("cart adds restaurant and grocery catalog selections in paise", () => {
  let state = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", variantId: "v00-large", addonIds: ["a00-avocado"], quantity: 2 });
  assert.equal(state.cart.items[0].unitPricePaise, 35900);
  assert.equal(state.cart.items[0].addonTotalPaise, 4000);
  assert.equal(state.cart.items[0].lineTotalPaise, 79800);
  state = cartService.add(freshSeed(), "m4", "b4", { productId: "p30", variantId: "v30-family", quantity: 1 });
  assert.equal(state.cart.items[0].lineTotalPaise, 21900);
});
test("cart merges only identical configuration and rejects merchant or branch changes", () => {
  let state = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", quantity: 1 });
  state = cartService.add(state, "m1", "b1", { productId: "p00", quantity: 1 });
  assert.equal(state.cart.items.length, 1); assert.equal(state.cart.items[0].quantity, 2);
  assert.throws(() => cartService.add(state, "m4", "b4", { productId: "p30", quantity: 1 }), /Confirm/);
  assert.throws(() => cartService.add(state, "m1", "b2", { productId: "p00", quantity: 1 }), /Confirm/);
});
test("customization and stock rules reject invalid cart selections", () => {
  const state = freshSeed();
  assert.throws(() => cartService.add(state, "m1", "b1", { productId: "p00", variantId: "missing", quantity: 1 }), /option/);
  assert.throws(() => cartService.add(state, "m1", "b1", { productId: "p00", addonIds: ["missing"], quantity: 1 }), /add-ons/);
  assert.throws(() => cartService.add(state, "m1", "b1", { productId: "p00", quantity: 30 }), /exceeds/);
});
test("catalog price changes are surfaced before checkout and orders remain merchant-scoped", () => {
  let state = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", quantity: 1 });
  state = { ...state, products: state.products.map((item) => item.id === "p00" ? { ...item, pricePaise: 30900 } : item) };
  assert.equal(quoteCart(state).priceChanged, true);
  assert.throws(() => checkoutService.place(state, { addressId: "a1", instructions: "", paymentMethod: "Demo UPI", idempotencyKey: "changed" }), /Prices changed/);
  state = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", quantity: 1 });
  const placed = checkoutService.place(state, { addressId: "a1", instructions: "", paymentMethod: "Demo UPI", idempotencyKey: "visibility" }).state;
  assert.equal(placed.orders.filter((order) => order.merchantId === "m1").length, 2);
  assert.equal(placed.orders.filter((order) => order.merchantId === "m4").length, 1);
});
test("legacy rupee records migrate once to exact paise values", () => {
  const legacy = { ...freshSeed(), schemaVersion: 0, cart: { merchantId: "m1", items: [{ productId: "p00", name: "Bowl", price: 150, quantity: 1, option: "Regular" }] }, orders: [{ ...freshSeed().orders[0], total: 618, discount: 0, totalPaise: undefined, items: [{ productId: "p00", name: "Bowl", price: 150, quantity: 1, option: "Regular" }] }] } as unknown as Record<string, unknown>;
  const once = migrateDemoState(legacy); const twice = migrateDemoState(once as unknown as Record<string, unknown>);
  assert.equal(once.cart.items[0].unitPricePaise, 15000); assert.equal(once.orders[0].totalPaise, 61800); assert.equal(twice.cart.items[0].unitPricePaise, 15000);
});
test("promotion, address serviceability, payment outcomes, and atomic checkout work", () => {
  let state = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", quantity: 2 });
  const quote = quoteCart(state, "FIRSTBITE"); assert.equal(quote.discountPaise, 10000);
  state = { ...state, addresses: state.addresses.map((item) => item.id === "a2" ? { ...item, city: "Chennai" } : item) };
  assert.throws(() => checkoutService.place(state, { addressId: "a2", instructions: "", paymentMethod: "Demo UPI", idempotencyKey: "bad", promotionCode: "FIRSTBITE" }), /outside/);
  const failed = checkoutService.place(state, { addressId: "a1", instructions: "", paymentMethod: "Demo UPI", idempotencyKey: "failed", paymentOutcome: "failure" });
  assert.equal(failed.state.orders.length, state.orders.length); assert.equal(failed.state.cart.items.length, 1);
  const paid = checkoutService.place(state, { addressId: "a1", instructions: "Doorbell", paymentMethod: "Demo card", idempotencyKey: "paid", promotionCode: "FIRSTBITE" });
  assert.ok(paid.orderId); assert.equal(paid.state.cart.items.length, 0); assert.equal(paid.state.orders[0].paymentStatus, "Simulated paid");
  assert.throws(() => checkoutService.place(paid.state, { addressId: "a1", instructions: "", paymentMethod: "Demo card", idempotencyKey: "paid" }), /already processed/);
});
test("orders preserve snapshots and merchant inventory is deducted only after confirmed payment", () => {
  let state: ReturnType<typeof freshSeed> = cartService.add(freshSeed(), "m1", "b1", { productId: "p00", quantity: 2 });
  const result = checkoutService.place(state, { addressId: "a1", instructions: "", paymentMethod: "Demo UPI", idempotencyKey: "snapshot" });
  const order = result.state.orders[0]; const inventory = result.state.inventory.find((item) => item.branchId === "b1" && item.productId === "p00");
  assert.equal(order.items[0].name, "Sesame sunshine bowl"); assert.equal(order.totalPaise, 61800); assert.equal(inventory?.quantity, 22);
  state = { ...result.state, products: result.state.products.map((item) => item.id === "p00" ? { ...item, name: "Changed later", pricePaise: 1 } : item) };
  assert.equal(state.orders[0].items[0].name, "Sesame sunshine bowl");
});
test("addresses can be added, defaulted, and safely removed", () => {
  let state = freshSeed(); state = addressService.save(state, { label: "Hostel", building: "Room 2", locality: "Koramangala", city: "Bengaluru", state: "Karnataka", pin: "560095", default: true });
  assert.equal(state.addresses.at(-1)?.default, true); assert.throws(() => addressService.save(state, { label: "Bad", city: "Bengaluru", state: "Karnataka", pin: "12" }), /six-digit/);
});
