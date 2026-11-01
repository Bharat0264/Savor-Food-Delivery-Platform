import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { deliveryOperations } from "../src/lib/services";
import { riderManagementService } from "../src/lib/services";

test("merchant rider memberships scope branches and suspension", () => {
  let state = riderManagementService.create(
    freshSeed(),
    "merchant",
    "m1",
    { name: "Neha Das", phone: "9000000000" },
    ["b1"],
  );
  const rider = state.riders.find((item) => item.name === "Neha Das")!;
  const membership = state.riderMemberships.find(
    (item) => item.riderId === rider.id,
  )!;
  assert.equal(rider.branchIds?.[0], "b1");
  state = riderManagementService.setMembershipStatus(
    state,
    "merchant",
    membership.id,
    "suspended",
  );
  assert.equal(
    state.riders.find((item) => item.id === rider.id)?.enabled,
    false,
  );
  assert.throws(
    () =>
      riderManagementService.create(
        state,
        "merchant",
        "m1",
        { name: "Invalid" },
        ["b2"],
      ),
    /branches/,
  );
});

test("rider profiles and branch memberships are merchant-scoped and auditable", () => {
  let state = freshSeed();
  const membership = state.riderMemberships.find(
    (item) => item.riderId === "r1" && item.merchantId === "m1",
  )!;
  state = riderManagementService.updateProfile(state, "merchant", "r1", {
    name: "Asha Menon",
    phone: "9876543210",
    email: "asha@example.test",
    vehicle: "KA 01 AB 1234",
  });
  state = riderManagementService.setBranches(state, "merchant", membership.id, [
    "b1",
  ]);
  assert.equal(
    state.riders.find((item) => item.id === "r1")?.email,
    "asha@example.test",
  );
  assert.ok(
    state.audit.some((entry) =>
      entry.message.includes("rider profile updated"),
    ),
  );
  assert.throws(
    () =>
      riderManagementService.setBranches(
        state,
        "merchant",
        state.riderMemberships.find((item) => item.riderId === "r3")!.id,
        ["b3"],
      ),
    /selected merchant/,
  );
});

test("multi-merchant membership preserves unrelated access while archival removes only one membership", () => {
  let state = freshSeed();
  state = riderManagementService.addMembership(state, "admin", "r1", "m2", [
    "b2",
  ]);
  const first = state.riderMemberships.find(
    (item) => item.riderId === "r1" && item.merchantId === "m1",
  )!;
  state = riderManagementService.setMembershipStatus(
    state,
    "admin",
    first.id,
    "archived",
  );
  const rider = state.riders.find((item) => item.id === "r1")!;
  assert.equal(rider.enabled, true);
  assert.ok(
    state.riderMemberships.some(
      (item) =>
        item.riderId === "r1" &&
        item.merchantId === "m2" &&
        item.status === "active",
    ),
  );
  assert.equal(
    riderManagementService
      .eligible(state, "m1", "b1")
      .some((item) => item.id === "r1"),
    false,
  );
  assert.equal(
    riderManagementService
      .eligible(state, "m2", "b2")
      .some((item) => item.id === "r1"),
    true,
  );
});

test("active deliveries block suspension and availability updates honour membership state", () => {
  let state = freshSeed();
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "accept",
  );
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "prepare",
  );
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  const membership = state.riderMemberships.find(
    (item) => item.riderId === "r1" && item.merchantId === "m1",
  )!;
  assert.throws(
    () =>
      riderManagementService.setMembershipStatus(
        state,
        "merchant",
        membership.id,
        "suspended",
      ),
    /Reassign active deliveries/,
  );
  assert.throws(
    () => riderManagementService.setAvailability(state, "r1", "Offline"),
    /Finish or reassign/,
  );
});

test("order delivery lifecycle validates merchant, rider, and OTP steps", () => {
  let state = freshSeed();
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "accept",
  );
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "prepare",
  );
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  assert.throws(
    () => deliveryOperations.riderTransition(state, "r2", "SV1042", "accept"),
    /not assigned/,
  );
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  state = deliveryOperations.riderTransition(
    state,
    "r1",
    "SV1042",
    "arrive_pickup",
  );
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "pickup");
  state = deliveryOperations.riderTransition(
    state,
    "r1",
    "SV1042",
    "arrive_destination",
  );
  state = deliveryOperations.verifyOtp(state, "r1", "SV1042", "4826");
  assert.equal(
    state.orders.find((order) => order.id === "SV1042")?.status,
    "Delivered",
  );
  assert.ok(
    state.orderEvents.some((event) => event.type === "delivery.completed"),
  );
});

test("OTP attempts and cross-merchant assignment are rejected", () => {
  let state = freshSeed();
  assert.throws(
    () => deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r3"),
    /eligible/,
  );
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "accept",
  );
  state = deliveryOperations.merchantTransition(
    state,
    "m1",
    "SV1042",
    "prepare",
  );
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  state = deliveryOperations.riderTransition(
    state,
    "r1",
    "SV1042",
    "arrive_pickup",
  );
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "pickup");
  state = deliveryOperations.riderTransition(
    state,
    "r1",
    "SV1042",
    "arrive_destination",
  );
  state = deliveryOperations.verifyOtp(state, "r1", "SV1042", "0000");
  assert.equal(state.orders[0].otpAttempts, 1);
});

test("cancellation restores eligible stock once and refunds stay paise-bounded", () => {
  let state = freshSeed();
  const before = state.inventory.find(
    (item) => item.branchId === "b1" && item.productId === "p00",
  )!.quantity;
  state = {
    ...state,
    inventory: state.inventory.map((item) =>
      item.branchId === "b1" && item.productId === "p00"
        ? { ...item, quantity: item.quantity - 2 }
        : item,
    ),
  };
  state = deliveryOperations.cancel(
    state,
    "customer",
    "SV1042",
    "Changed my mind",
  );
  assert.equal(
    state.inventory.find(
      (item) => item.branchId === "b1" && item.productId === "p00",
    )?.quantity,
    before,
  );
  assert.throws(
    () => deliveryOperations.cancel(state, "customer", "SV1042", "Again"),
    /no longer/,
  );
  state = deliveryOperations.refund(
    state,
    "admin",
    "SV1042",
    10000,
    "Service recovery",
  );
  assert.equal(state.refunds.at(-1)?.amountPaise, 10000);
  assert.throws(
    () =>
      deliveryOperations.refund(state, "admin", "SV1042", 60000, "Too much"),
    /exceeds/,
  );
});

const readyOrder = () => {
  let state = freshSeed();
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "accept");
  state = deliveryOperations.merchantTransition(state, "m1", "SV1042", "prepare");
  return deliveryOperations.merchantTransition(state, "m1", "SV1042", "ready");
};

test("assignment reservations, acceptance, decline, and history stay consistent", () => {
  let state = readyOrder();
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  assert.equal(state.assignments.at(-1)?.status, "pending");
  assert.equal(state.riders.find((rider) => rider.id === "r1")?.availability, "Busy");
  assert.throws(() => deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r2"), /already has an active/);
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "decline");
  assert.equal(state.assignments.at(-1)?.status, "declined");
  assert.equal(state.orders.find((order) => order.id === "SV1042")?.riderId, undefined);
  assert.equal(state.riders.find((rider) => rider.id === "r1")?.availability, "Available");
  assert.ok(state.assignmentEvents.some((event) => event.action === "assignment.declined"));
  assert.throws(() => deliveryOperations.riderTransition(state, "r1", "SV1042", "decline"), /not assigned/);
});

test("reassignment closes prior access, rotates OTP, and preserves assignment history", () => {
  let state = readyOrder();
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  const oldOtp = state.orders.find((order) => order.id === "SV1042")!.otp;
  assert.throws(() => deliveryOperations.reassign(state, "merchant", "m1", "SV1042", "r2", ""), /reason/);
  state = deliveryOperations.reassign(state, "merchant", "m1", "SV1042", "r2", "Rider requested release");
  assert.equal(state.assignments.filter((assignment) => assignment.orderId === "SV1042").length, 2);
  assert.equal(state.assignments.find((assignment) => assignment.riderId === "r1")?.status, "reassigned");
  assert.equal(state.orders.find((order) => order.id === "SV1042")?.riderId, "r2");
  assert.notEqual(state.orders.find((order) => order.id === "SV1042")?.otp, oldOtp);
  assert.throws(() => deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_pickup"), /not assigned/);
  assert.ok(state.assignmentEvents.some((event) => event.action === "assignment.reassigned"));
});

test("cancellation closes current assignment and releases the reserved workload", () => {
  let state = readyOrder();
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  state = deliveryOperations.cancel(state, "admin", "SV1042", "Operational cancellation");
  assert.equal(state.orders.find((order) => order.id === "SV1042")?.status, "Cancelled");
  assert.equal(state.assignments.at(-1)?.status, "cancelled");
  assert.equal(state.riders.find((rider) => rider.id === "r1")?.availability, "Available");
  assert.throws(() => deliveryOperations.riderTransition(state, "r1", "SV1042", "accept"), /not assigned/);
});

test("post-pickup reassignment requires an admin-confirmed custody handover", () => {
  let state = readyOrder();
  state = deliveryOperations.assign(state, "merchant", "m1", "SV1042", "r1");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "accept");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "arrive_pickup");
  state = deliveryOperations.riderTransition(state, "r1", "SV1042", "pickup");
  assert.throws(() => deliveryOperations.reassign(state, "merchant", "m1", "SV1042", "r2", "Vehicle issue"), /custody handover/);
  state = deliveryOperations.reassign(state, "admin", "m1", "SV1042", "r2", "Verified custody transfer", true);
  assert.equal(state.assignments.at(-1)?.status, "accepted");
  assert.equal(state.assignments.at(-1)?.custodyHandoverConfirmed, true);
  assert.ok(state.assignmentEvents.some((event) => event.action === "assignment.custody_handover"));
});
