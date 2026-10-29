import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { merchantManagement } from "../src/lib/services";

test("merchant managers can create, select, and operate their own branch", () => {
  let state = freshSeed();
  state = merchantManagement.addBranch(state, "merchant", "m1", {
    name: "Indiranagar kitchen",
    address: "100 Feet Road, Indiranagar",
    city: "Bengaluru",
    acceptingOrders: true,
    deliveryAvailable: true,
  });
  const branch = state.branches.find((item) => item.name === "Indiranagar kitchen");
  assert.ok(branch);

  state = merchantManagement.selectBranch(state, branch.id);
  assert.equal(state.selection.merchantId, "m1");
  assert.equal(state.selection.branchId, branch.id);

  state = merchantManagement.updateBranch(state, "merchant", branch.id, {
    acceptingOrders: false,
  });
  assert.equal(
    state.branches.find((item) => item.id === branch.id)?.acceptingOrders,
    false,
  );
});

test("merchant scope prevents cross-merchant branch and manager changes", () => {
  const state = freshSeed();
  assert.throws(
    () =>
      merchantManagement.addBranch(state, "merchant", "m2", {
        name: "Unauthorised branch",
        address: "Indiranagar",
        city: "Bengaluru",
        acceptingOrders: true,
        deliveryAvailable: true,
      }),
    /selected merchant/,
  );
  assert.throws(
    () => merchantManagement.assignManager(state, "merchant", "manager-m1", ["b2"]),
    /branches of their merchant/,
  );
});

test("branch manager access remains merchant-scoped and can be disabled", () => {
  let state = freshSeed();
  state = merchantManagement.addManager(state, "merchant", "m1", "Sonal Shah", ["b1"]);
  const manager = state.merchantManagers.find((item) => item.name === "Sonal Shah");
  assert.ok(manager);

  state = merchantManagement.setManagerActive(state, "merchant", manager.id, false);
  assert.equal(
    state.merchantManagers.find((item) => item.id === manager.id)?.active,
    false,
  );
  assert.throws(
    () => merchantManagement.assignManager(state, "merchant", manager.id, ["b2"]),
    /branches of their merchant/,
  );
});

test("registration is pending until an admin approves the merchant", () => {
  let state = freshSeed();
  state = merchantManagement.register(state, {
    name: "Mango House",
    kind: "grocery",
    category: "Fresh fruit",
    description: "Seasonal fruit and everyday essentials.",
    address: "Richmond Road, Bengaluru",
    image: "/images/grocery.jpg",
  });
  const merchant = state.merchants.find((item) => item.name === "Mango House");
  assert.ok(merchant);
  assert.equal(merchant.lifecycle, "pending");
  assert.equal(merchant.approved, false);
  assert.equal(state.branches.find((branch) => branch.merchantId === merchant.id)?.acceptingOrders, false);

  state = merchantManagement.review(state, merchant.id, "approve");
  const approved = state.merchants.find((item) => item.id === merchant.id);
  assert.equal(approved?.lifecycle, "approved");
  assert.equal(approved?.approved, true);
});

test("suspending a merchant immediately pauses every branch", () => {
  let state = freshSeed();
  state = merchantManagement.review(state, "m1", "suspend");
  assert.equal(state.merchants.find((item) => item.id === "m1")?.lifecycle, "suspended");
  assert.equal(state.merchants.find((item) => item.id === "m1")?.open, false);
  assert.ok(
    state.branches
      .filter((branch) => branch.merchantId === "m1")
      .every((branch) => !branch.acceptingOrders && !branch.deliveryAvailable),
  );
});
