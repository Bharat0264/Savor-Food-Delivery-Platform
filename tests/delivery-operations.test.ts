import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { deliveryOperations } from "../src/lib/services";

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
