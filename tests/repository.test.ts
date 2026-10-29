import test from "node:test";
import assert from "node:assert/strict";
import { freshSeed } from "../src/lib/seed";
import {
  addCartItem,
  placeOrder,
  updateOrder,
  verifyDelivery,
} from "../src/lib/repository";
const item = {
  productId: "p00",
  name: "Sesame sunshine bowl",
  price: 289,
  quantity: 2,
  option: "Regular",
};
test("Customer → merchant → rider → completed shared order", () => {
  let s = addCartItem(freshSeed(), "m1", item);
  const result = placeOrder(s, {
    addressId: "a1",
    instructions: "Doorbell",
    payment: "Demo UPI",
    discount: 100,
    now: "2026-10-28T12:00:00Z",
  });
  s = result.state;
  assert.equal(result.order.total, 518);
  assert.equal(s.cart.items.length, 0);
  assert.equal(s.products[0].stock, 22);
  const id = result.order.id;
  s = updateOrder(s, id, "Accepted");
  s = updateOrder(s, id, "Preparing");
  s = updateOrder(s, id, "Ready", "r1");
  assert.equal(s.riders[0].availability, "Busy");
  s = updateOrder(s, id, "Out for delivery");
  assert.throws(() => verifyDelivery(s, id, "r1", "0000"), /OTP/);
  s = verifyDelivery(s, id, "r1", result.order.otp);
  assert.equal(s.orders[0].status, "Delivered");
  assert.equal(s.riders[0].availability, "Available");
  assert.equal(s.audit.length, 6);
});
test("Merchant replacement requires confirmation and supports grocery checkout", () => {
  let s = addCartItem(freshSeed(), "m1", item);
  const grocery = {
    productId: "p30",
    name: "Avocados",
    price: 149,
    quantity: 1,
    option: "Standard",
  };
  assert.throws(() => addCartItem(s, "m4", grocery), /Confirm/);
  s = addCartItem(s, "m4", grocery, true);
  const result = placeOrder(s, {
    addressId: "a2",
    instructions: "",
    payment: "Demo card",
    discount: 100,
    now: "2026-10-28T12:00:00Z",
  });
  assert.equal(result.order.merchantId, "m4");
  assert.equal(result.order.total, 189);
  assert.equal(result.order.discount, 0);
});
test("Unassociated riders and status jumps are rejected", () => {
  const s = freshSeed();
  assert.throws(() => updateOrder(s, "SV1042", "Pending", "r3"), /associated/);
  assert.throws(() => updateOrder(s, "SV1042", "Delivered"), /status/);
  assert.throws(() => verifyDelivery(s, "SV1042", "r2", "4826"), /assigned/);
});
test("Stock is checked across variations and cancellation restores stock once", () => {
  let s = addCartItem(freshSeed(), "m1", { ...item, quantity: 15 });
  s = addCartItem(s, "m1", { ...item, quantity: 15, option: "Large" });
  assert.throws(
    () =>
      placeOrder(s, {
        addressId: "a1",
        instructions: "",
        payment: "Demo UPI",
        discount: 0,
        now: "2026-10-28",
      }),
    /quantity/,
  );
  s = addCartItem(freshSeed(), "m1", item);
  const result = placeOrder(s, {
    addressId: "a1",
    instructions: "",
    payment: "Demo UPI",
    discount: 0,
    now: "2026-10-28",
  });
  s = updateOrder(result.state, result.order.id, "Cancelled");
  assert.equal(s.products[0].stock, 24);
  s = updateOrder(s, result.order.id, "Cancelled");
  assert.equal(s.products[0].stock, 24);
});
test("Paused or unapproved stores reject checkout", () => {
  const s = addCartItem(freshSeed(), "m1", item);
  s.settings.storeOpen = false;
  assert.throws(
    () =>
      placeOrder(s, {
        addressId: "a1",
        instructions: "",
        payment: "Demo UPI",
        discount: 0,
        now: "2026-10-28",
      }),
    /paused/,
  );
});

test("Rider reassignment frees the previous rider and prevents double booking", () => {
  let s = freshSeed();
  s = updateOrder(s, "SV1042", "Pending", "r1");
  s = updateOrder(s, "SV1042", "Pending", "r2");
  assert.equal(s.riders[0].availability, "Available");
  assert.equal(s.riders[1].availability, "Busy");
  s = addCartItem(s, "m1", item);
  const result = placeOrder(s, {
    addressId: "a1",
    instructions: "",
    payment: "Demo UPI",
    discount: 0,
    now: "2026-10-28",
  });
  assert.throws(
    () => updateOrder(result.state, result.order.id, "Pending", "r2"),
    /active assignment/,
  );
});
