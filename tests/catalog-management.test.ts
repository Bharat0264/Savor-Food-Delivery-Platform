import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { catalogForBranch, catalogManagement, type CatalogProductInput } from "../src/lib/services";

const productInput = (merchantId = "m1"): CatalogProductInput => ({
  merchantId,
  name: "Chicken biryani",
  description: "Fragrant basmati rice with tender chicken.",
  category: "Indian classics",
  image: "/images/food.jpg",
  vegetarian: false,
  pricePaise: 24900,
  stock: 12,
  available: true,
  preparationMinutes: 25,
  variants: [
    { id: "half", name: "Half", pricePaise: 14900, active: true },
    { id: "full", name: "Full", pricePaise: 24900, active: true },
  ],
  customizationGroups: [
    {
      id: "extras",
      name: "Extras",
      required: false,
      minSelections: 0,
      maxSelections: 2,
      addons: [
        { id: "chicken", name: "Extra chicken", pricePaise: 7000, active: true },
        { id: "raita", name: "Extra raita", pricePaise: 2000, active: true },
      ],
    },
  ],
});

test("restaurant category creation, rename, and ordering are catalog-scoped", () => {
  let state = freshSeed();
  state = catalogManagement.createCategory(state, "merchant", "m1", { name: "Chef specials", kind: "food" });
  const category = state.catalogCategories.find((item) => item.name === "Chef specials");
  assert.ok(category);
  state = catalogManagement.renameCategory(state, "merchant", category.id, "Chef's specials");
  assert.equal(state.catalogCategories.find((item) => item.id === category.id)?.name, "Chef's specials");
  const ids = state.catalogCategories.filter((item) => item.merchantId === "m1").map((item) => item.id);
  state = catalogManagement.reorderCategories(state, "merchant", "m1", [...ids].reverse());
  assert.equal(state.catalogCategories.find((item) => item.id === ids[0])?.sortOrder, ids.length - 1);
});

test("restaurant products persist variants and validated add-ons", () => {
  let state = freshSeed();
  state = catalogManagement.saveProduct(state, "merchant", "b1", productInput());
  const product = state.products.find((item) => item.name === "Chicken biryani");
  assert.ok(product);
  assert.equal(product.pricePaise, 24900);
  assert.equal(product.variants[0].pricePaise, 14900);
  assert.equal(product.customizationGroups[0].addons[0].pricePaise, 7000);
  state = catalogManagement.saveProduct(state, "merchant", "b1", { ...productInput(), name: "Chicken biryani deluxe", pricePaise: 25900 }, product.id);
  assert.equal(state.products.find((item) => item.id === product.id)?.name, "Chicken biryani deluxe");
  assert.throws(() => catalogManagement.saveProduct(state, "merchant", "b1", { ...productInput(), variants: [{ id: "bad", name: "Bad", pricePaise: -1, active: true }] }), /valid paise/);
  assert.throws(() => catalogManagement.saveProduct(state, "merchant", "b1", { ...productInput(), customizationGroups: [{ id: "bad", name: "Required", required: true, minSelections: 0, maxSelections: 0, addons: [] }] }), /Required customizations/);
});

test("archived or branch-disabled products leave the customer catalog", () => {
  let state = freshSeed();
  state = catalogManagement.archiveProduct(state, "merchant", "b1", "p00", true);
  assert.ok(!catalogForBranch(state, "m1", "b1").some((item) => item.id === "p00"));
  state = catalogManagement.archiveProduct(state, "merchant", "b1", "p00", false);
  state = catalogManagement.setBranchCatalog(state, "merchant", "b1", "p00", { available: false });
  assert.equal(catalogForBranch(state, "m1", "b1").find((item) => item.id === "p00")?.available, false);
});

test("grocery products enforce MRP and retain branch-specific price and stock", () => {
  let state = freshSeed();
  const grocery: CatalogProductInput = { ...productInput("m4"), name: "Basmati rice", description: "Aged basmati rice.", category: "Pantry", image: "/images/grocery.jpg", vegetarian: true, pricePaise: 38500, mrpPaise: 40000, stock: 8, variants: [{ id: "one-kg", name: "1 kg", pricePaise: 38500, mrpPaise: 40000, active: true, unit: "1 kg" }, { id: "five-kg", name: "5 kg", pricePaise: 180000, mrpPaise: 200000, active: true, unit: "5 kg" }], customizationGroups: [] };
  state.selection = { ...state.selection, merchantId: "m4", branchId: "b4" };
  state = catalogManagement.saveProduct(state, "merchant", "b4", grocery);
  const rice = state.products.find((item) => item.name === "Basmati rice");
  assert.ok(rice);
  state = catalogManagement.setBranchCatalog(state, "merchant", "b4", rice.id, { available: true, pricePaise: 37500 });
  state = catalogManagement.adjustInventory(state, "merchant", "b4", rice.id, 5, "Receiving delivery");
  const view = catalogForBranch(state, "m4", "b4").find((item) => item.id === rice.id);
  assert.equal(view?.pricePaise, 37500);
  assert.equal(view?.stock, 13);
  assert.throws(() => catalogManagement.saveProduct(state, "merchant", "b4", { ...grocery, name: "Invalid rice", pricePaise: 41000 }), /exceed/);
});

test("inventory detects low stock and prevents negative quantities", () => {
  let state = freshSeed();
  state = catalogManagement.updateInventory(state, "merchant", "b1", "p00", { quantity: 3, lowStockThreshold: 5, enabled: true });
  assert.equal(catalogForBranch(state, "m1", "b1").find((item) => item.id === "p00")?.stock, 3);
  assert.throws(() => catalogManagement.adjustInventory(state, "merchant", "b1", "p00", -4, "Count correction"), /below zero/);
  state = catalogManagement.adjustInventory(state, "merchant", "b1", "p00", 2, "Receiving delivery");
  assert.equal(state.stockAdjustments[0].reason, "Receiving delivery");
});

test("merchant and branch isolation deny cross-business catalog changes", () => {
  const state = freshSeed();
  assert.throws(() => catalogManagement.archiveProduct(state, "merchant", "b2", "p10", true), /(selected merchant|not authorized)/);
  assert.throws(() => catalogManagement.setBranchCatalog(state, "merchant", "b1", "p10", { available: true }), /does not belong/);
  assert.throws(() => catalogManagement.createCategory(state, "merchant", "m2", { name: "No access", kind: "food" }), /selected merchant/);
});

test("super admin override and mock media actions create catalog audit history", () => {
  let state = freshSeed();
  state = catalogManagement.setBranchCatalog(state, "admin", "b2", "p10", { available: false, pricePaise: 31900 });
  assert.equal(catalogForBranch(state, "m2", "b2").find((item) => item.id === "p10")?.available, false);
  const result = catalogManagement.addMedia(state, "admin", "m2", { filename: "menu-card.jpg", url: "/images/pizza.jpg", sizeBytes: 34000, contentType: "image/jpeg" });
  state = result.state;
  assert.equal(state.catalogMedia[0].id, result.media.id);
  state = catalogManagement.removeMedia(state, "admin", result.media.id);
  assert.ok(state.catalogAudit.some((event) => event.action === "branch-catalog.updated"));
  assert.ok(state.catalogAudit.some((event) => event.action === "media.removed"));
});

test("fresh demo fixtures include independent branch inventory and reset-safe catalog state", () => {
  const first = freshSeed();
  const second = freshSeed();
  first.inventory[0].quantity = 0;
  assert.notEqual(second.inventory[0].quantity, 0);
  assert.ok(second.catalogCategories.length > 0);
  assert.ok(second.products.every((product) => Number.isInteger(product.pricePaise)));
});
