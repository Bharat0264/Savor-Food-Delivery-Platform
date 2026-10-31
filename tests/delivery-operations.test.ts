import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { deliveryOperations } from "../src/lib/services";
import { riderManagementService } from "../src/lib/services";

test("merchant rider memberships scope branches and suspension", () => {
  let state = riderManagementService.create(freshSeed(), "merchant", "m1", { name: "Neha Das", phone: "9000000000" }, ["b1"]);
  const rider = state.riders.find((item) => item.name === "Neha Das")!; const membership = state.riderMemberships.find((item) => item.riderId === rider.id)!;
  assert.equal(rider.branchIds?.[0], "b1");
  state = riderManagementService.setMembershipStatus(state, "merchant", membership.id, "suspended");
  assert.equal(state.riders.find((item) => item.id === rider.id)?.enabled, false);
  assert.throws(() => riderManagementService.create(state, "merchant", "m1", { name: "Invalid" }, ["b2"]), /branches/);
});

test("order delivery lifecycle validates merchant, rider, and OTP steps", () => {
  let state = freshSeed();
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "accept");
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "prepare");
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  assert.throws(() => deliveryOperations.riderTransition(state, "r2", "SV1042", "accept"), /not assigned/);
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_pickup");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "pickup");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_destination");
  state = deliveryOperations.verifyOtp(state, "r1", "SV1042", "4826");
  assert.equal(state.orders.find((order) => order.id === "SV1042")?.status, "Delivered");
  assert.ok(state.orderEvents.some((event) => event.type === "delivery.completed"));
});

test("OTP attempts and cross-merchant assignment are rejected", () => {
  let state = freshSeed();
  assert.throws(() => deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r3"), /eligible/);
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "accept");
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "prepare");
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_pickup");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "pickup");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_destination");
  state = deliveryOperations.verifyOtp(state, "r1", "SV1042", "0000");
  assert.equal(state.orders[0].otpAttempts, 1);
});

test("cancellation restores eligible stock once and refunds stay paise-bounded", () => {
  let state = freshSeed(); const before = state.inventory.find((item) => item.branchId === "b1" && item.productId === "p00")!.quantity;
  state = { ...state, inventory: state.inventory.map((item) => item.branchId === "b1" && item.productId === "p00" ? { ...item, quantity: item.quantity - 2 } : item) };
  state = deliveryOperations.cancel(state, "customer", "SV1042", "Changed my mind");
  assert.equal(state.inventory.find((item) => item.branchId === "b1" && item.productId === "p00")?.quantity, before);
  assert.throws(() => deliveryOperations.cancel(state, "customer", "SV1042", "Again"), /no longer/);
  state = deliveryOperations.refund(state, "admin", "SV1042", 10000, "Service recovery");
  assert.equal(state.refunds.at(-1)?.amountPaise, 10000);
  assert.throws(() => deliveryOperations.refund(state, "admin", "SV1042", 60000, "Too much"), /exceeds/);
});
