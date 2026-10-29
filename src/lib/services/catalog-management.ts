import {
  BranchCatalogOverride,
  CatalogAddon,
  CatalogCategory,
  CatalogMedia,
  InventoryRecord,
  Product,
  ProductCustomizationGroup,
  ProductVariant,
  State,
} from "../model";
import type { DemoActor } from "./merchant-management";

export type CatalogProductInput = Omit<
  Product,
  "id" | "price" | "stock" | "archived" | "available" | "mediaId"
> & {
  stock: number;
  archived?: boolean;
  available?: boolean;
  mediaId?: string;
};

export type BranchCatalogInput = Pick<BranchCatalogOverride, "available" | "pricePaise">;
export type InventoryInput = Pick<InventoryRecord, "quantity" | "lowStockThreshold" | "enabled">;
export type MockMediaInput = Pick<CatalogMedia, "filename" | "url" | "sizeBytes" | "contentType">;

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const isWholePaise = (value: number) => Number.isSafeInteger(value) && value >= 0;
const activeManager = (state: State, merchantId: string) =>
  state.merchantManagers.find((manager) => manager.merchantId === merchantId && manager.active);

function assertMerchantScope(state: State, actor: DemoActor, merchantId: string) {
  if (actor === "admin") return;
  if (state.selection.merchantId !== merchantId) throw Error("This demo manager can only manage the selected merchant.");
}
function assertBranchScope(state: State, actor: DemoActor, branchId: string) {
  const branch = state.branches.find((item) => item.id === branchId);
  if (!branch) throw Error("Branch not found.");
  assertMerchantScope(state, actor, branch.merchantId);
  if (actor === "admin") return branch;
  const manager = activeManager(state, branch.merchantId);
  if (!manager?.branchIds.includes(branchId)) throw Error("This demo manager is not authorized for this branch.");
  return branch;
}
function assertProduct(state: State, productId: string) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) throw Error("Product not found.");
  return product;
}
function audit(state: State, merchantId: string, entityId: string, action: string, message: string, branchId?: string) {
  const event = { id: id("catalog-audit"), merchantId, branchId, entityId, action, message, createdAt: now() };
  return {
    catalogAudit: [event, ...state.catalogAudit],
    audit: [{ id: id("audit"), message }, ...state.audit],
  };
}
function validateVariants(variants: ProductVariant[], basePricePaise: number) {
  if (!isWholePaise(basePricePaise) || basePricePaise < 100) throw Error("Set a valid non-zero selling price.");
  const names = new Set<string>();
  variants.forEach((variant) => {
    const name = variant.name.trim().toLowerCase();
    if (!name || names.has(name)) throw Error("Each variant needs a unique name.");
    names.add(name);
    if (!isWholePaise(variant.pricePaise) || variant.pricePaise < 100) throw Error("Variant prices must be valid paise amounts.");
    if (variant.mrpPaise !== undefined && (!isWholePaise(variant.mrpPaise) || variant.pricePaise > variant.mrpPaise)) {
      throw Error("A selling price cannot exceed its applicable MRP.");
    }
  });
}
function validateGroups(groups: ProductCustomizationGroup[]) {
  groups.forEach((group) => {
    if (!group.name.trim()) throw Error("Every customization group needs a name.");
    if (!Number.isInteger(group.minSelections) || !Number.isInteger(group.maxSelections) || group.minSelections < 0 || group.maxSelections < group.minSelections) {
      throw Error("Customization selection limits are invalid.");
    }
    if (group.required && group.minSelections < 1) throw Error("Required customizations must select at least one option.");
    if (group.maxSelections > group.addons.length) throw Error("A customization group cannot select more add-ons than it contains.");
    const names = new Set<string>();
    group.addons.forEach((addon: CatalogAddon) => {
      const name = addon.name.trim().toLowerCase();
      if (!name || names.has(name) || !isWholePaise(addon.pricePaise)) throw Error("Add-ons need unique names and valid prices.");
      names.add(name);
    });
  });
}
function productFromInput(input: CatalogProductInput, existing?: Product): Product {
  validateVariants(input.variants, input.pricePaise);
  validateGroups(input.customizationGroups);
  if (!Number.isInteger(input.stock) || input.stock < 0) throw Error("Stock cannot be negative.");
  if (input.mrpPaise !== undefined && (!isWholePaise(input.mrpPaise) || input.pricePaise > input.mrpPaise)) {
    throw Error("A selling price cannot exceed its applicable MRP.");
  }
  if (!input.name.trim() || !input.description.trim() || !input.category.trim()) throw Error("Name, description, and category are required.");
  return {
    ...input,
    id: existing?.id ?? id("product"),
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    price: Math.round(input.pricePaise / 100),
    archived: input.archived ?? existing?.archived ?? false,
    available: input.available ?? existing?.available ?? input.stock > 0,
  };
}

export function catalogForBranch(state: State, merchantId: string, branchId: string, includeArchived = false) {
  return state.products
    .filter((product) => product.merchantId === merchantId && (includeArchived || !product.archived))
    .map((product) => {
      const override = state.branchCatalog.find((item) => item.branchId === branchId && item.productId === product.id && !item.variantId);
      const inventory = state.inventory.find((item) => item.branchId === branchId && item.productId === product.id && !item.variantId);
      const pricePaise = override?.pricePaise ?? product.pricePaise;
      const stock = inventory?.quantity ?? product.stock;
      return { ...product, pricePaise, price: Math.round(pricePaise / 100), stock, available: product.available && (override?.available ?? true) && (inventory?.enabled ?? true) && stock > 0 };
    });
}

export interface CatalogManagementService {
  createCategory(state: State, actor: DemoActor, merchantId: string, input: Pick<CatalogCategory, "name" | "kind" | "department">): State;
  renameCategory(state: State, actor: DemoActor, categoryId: string, name: string): State;
  reorderCategories(state: State, actor: DemoActor, merchantId: string, categoryIds: string[]): State;
  saveProduct(state: State, actor: DemoActor, branchId: string, input: CatalogProductInput, productId?: string): State;
  archiveProduct(state: State, actor: DemoActor, branchId: string, productId: string, archived: boolean): State;
  setBranchCatalog(state: State, actor: DemoActor, branchId: string, productId: string, input: BranchCatalogInput): State;
  updateInventory(state: State, actor: DemoActor, branchId: string, productId: string, patch: InventoryInput): State;
  adjustInventory(state: State, actor: DemoActor, branchId: string, productId: string, delta: number, reason: string): State;
  addMedia(state: State, actor: DemoActor, merchantId: string, input: MockMediaInput): { state: State; media: CatalogMedia };
  removeMedia(state: State, actor: DemoActor, mediaId: string): State;
}

export const catalogManagement: CatalogManagementService = {
  createCategory(state, actor, merchantId, input) {
    assertMerchantScope(state, actor, merchantId);
    assertBranchScope(state, actor, state.selection.branchId);
    if (!input.name.trim()) throw Error("Enter a category name.");
    if (state.catalogCategories.some((category) => category.merchantId === merchantId && category.name.toLowerCase() === input.name.trim().toLowerCase() && !category.archived)) throw Error("This category already exists.");
    const category: CatalogCategory = { id: id("category"), merchantId, ...input, name: input.name.trim(), sortOrder: state.catalogCategories.filter((item) => item.merchantId === merchantId).length, archived: false };
    return { ...state, catalogCategories: [...state.catalogCategories, category], ...audit(state, merchantId, category.id, "category.created", `${category.name}: category created`) };
  },
  renameCategory(state, actor, categoryId, name) {
    const category = state.catalogCategories.find((item) => item.id === categoryId);
    if (!category || !name.trim()) throw Error("Category not found or name is empty.");
    assertMerchantScope(state, actor, category.merchantId);
    assertBranchScope(state, actor, state.selection.branchId);
    return { ...state, catalogCategories: state.catalogCategories.map((item) => item.id === categoryId ? { ...item, name: name.trim() } : item), products: state.products.map((product) => product.merchantId === category.merchantId && product.category === category.name ? { ...product, category: name.trim() } : product), ...audit(state, category.merchantId, categoryId, "category.renamed", `${category.name}: category renamed`) };
  },
  reorderCategories(state, actor, merchantId, categoryIds) {
    assertMerchantScope(state, actor, merchantId);
    assertBranchScope(state, actor, state.selection.branchId);
    const owned = state.catalogCategories.filter((item) => item.merchantId === merchantId && !item.archived);
    if (owned.length !== categoryIds.length || categoryIds.some((item) => !owned.some((category) => category.id === item))) throw Error("Use every category from this merchant exactly once.");
    return { ...state, catalogCategories: state.catalogCategories.map((category) => ({ ...category, sortOrder: category.merchantId === merchantId ? categoryIds.indexOf(category.id) : category.sortOrder })), ...audit(state, merchantId, merchantId, "category.reordered", "Catalog categories reordered") };
  },
  saveProduct(state, actor, branchId, input, productId) {
    const branch = assertBranchScope(state, actor, branchId);
    if (input.merchantId !== branch.merchantId) throw Error("Products must belong to the selected branch merchant.");
    const existing = productId ? assertProduct(state, productId) : undefined;
    if (existing && existing.merchantId !== branch.merchantId) throw Error("Products cannot move between merchants.");
    const product = productFromInput(input, existing);
    const inventory: InventoryRecord = { id: existing ? state.inventory.find((item) => item.branchId === branchId && item.productId === existing.id && !item.variantId)?.id ?? id("inventory") : id("inventory"), merchantId: branch.merchantId, branchId, productId: product.id, quantity: input.stock, lowStockThreshold: state.inventory.find((item) => item.branchId === branchId && item.productId === product.id)?.lowStockThreshold ?? 5, enabled: product.available };
    return { ...state, products: existing ? state.products.map((item) => item.id === product.id ? product : item) : [...state.products, product], inventory: [...state.inventory.filter((item) => item.id !== inventory.id), inventory], ...audit(state, branch.merchantId, product.id, existing ? "product.updated" : "product.created", `${product.name}: ${existing ? "product updated" : "product created"}`, branchId) };
  },
  archiveProduct(state, actor, branchId, productId, archived) {
    const branch = assertBranchScope(state, actor, branchId);
    const product = assertProduct(state, productId);
    if (product.merchantId !== branch.merchantId) throw Error("Product does not belong to this branch merchant.");
    return { ...state, products: state.products.map((item) => item.id === productId ? { ...item, archived, available: archived ? false : item.available } : item), ...audit(state, branch.merchantId, productId, archived ? "product.archived" : "product.restored", `${product.name}: ${archived ? "archived" : "restored"}`, branchId) };
  },
  setBranchCatalog(state, actor, branchId, productId, input) {
    const branch = assertBranchScope(state, actor, branchId);
    const product = assertProduct(state, productId);
    if (product.merchantId !== branch.merchantId) throw Error("Product does not belong to this branch merchant.");
    if (input.pricePaise !== undefined && (!isWholePaise(input.pricePaise) || input.pricePaise < 100 || (product.mrpPaise !== undefined && input.pricePaise > product.mrpPaise))) throw Error("Branch price is invalid or exceeds MRP.");
    const prior = state.branchCatalog.find((item) => item.branchId === branchId && item.productId === productId && !item.variantId);
    const override: BranchCatalogOverride = { id: prior?.id ?? id("branch-catalog"), merchantId: branch.merchantId, branchId, productId, available: input.available, pricePaise: input.pricePaise };
    return { ...state, branchCatalog: [...state.branchCatalog.filter((item) => item.id !== override.id), override], ...audit(state, branch.merchantId, productId, "branch-catalog.updated", `${product.name}: branch availability or price updated`, branchId) };
  },
  updateInventory(state, actor, branchId, productId, patch) {
    const branch = assertBranchScope(state, actor, branchId);
    const product = assertProduct(state, productId);
    if (product.merchantId !== branch.merchantId || !Number.isInteger(patch.quantity) || patch.quantity < 0 || !Number.isInteger(patch.lowStockThreshold) || patch.lowStockThreshold < 0) throw Error("Inventory quantities must be whole, non-negative values.");
    const prior = state.inventory.find((item) => item.branchId === branchId && item.productId === productId && !item.variantId);
    const record: InventoryRecord = { id: prior?.id ?? id("inventory"), merchantId: branch.merchantId, branchId, productId, ...patch };
    return { ...state, inventory: [...state.inventory.filter((item) => item.id !== record.id), record], ...audit(state, branch.merchantId, productId, "inventory.updated", `${product.name}: inventory updated`, branchId) };
  },
  adjustInventory(state, actor, branchId, productId, delta, reason) {
    if (!Number.isInteger(delta) || !reason.trim()) throw Error("Use a whole stock adjustment and record a reason.");
    const current = state.inventory.find((item) => item.branchId === branchId && item.productId === productId && !item.variantId);
    if (!current) throw Error("Create inventory before making an adjustment.");
    const next = current.quantity + delta;
    if (next < 0) throw Error("Stock cannot fall below zero.");
    const nextState = this.updateInventory(state, actor, branchId, productId, { quantity: next, lowStockThreshold: current.lowStockThreshold, enabled: current.enabled });
    const adjustment = { id: id("stock-adjustment"), inventoryId: current.id, delta, reason: reason.trim(), createdAt: now() };
    return { ...nextState, stockAdjustments: [adjustment, ...nextState.stockAdjustments], audit: [{ id: id("audit"), message: `${assertProduct(state, productId).name}: stock ${delta >= 0 ? "+" : ""}${delta} · ${reason.trim()}` }, ...nextState.audit] };
  },
  addMedia(state, actor, merchantId, input) {
    assertMerchantScope(state, actor, merchantId);
    if (!input.contentType.startsWith("image/") || input.sizeBytes < 1 || input.sizeBytes > 5_000_000 || !input.url.startsWith("/")) throw Error("Mock media must be a local image under 5 MB.");
    const media: CatalogMedia = { id: id("media"), merchantId, ...input };
    return { state: { ...state, catalogMedia: [...state.catalogMedia, media], ...audit(state, merchantId, media.id, "media.added", `${media.filename}: catalog image added`) }, media };
  },
  removeMedia(state, actor, mediaId) {
    const media = state.catalogMedia.find((item) => item.id === mediaId);
    if (!media) throw Error("Media not found.");
    assertMerchantScope(state, actor, media.merchantId);
    return { ...state, catalogMedia: state.catalogMedia.filter((item) => item.id !== mediaId), products: state.products.map((product) => product.mediaId === mediaId ? { ...product, mediaId: undefined } : product), ...audit(state, media.merchantId, mediaId, "media.removed", `${media.filename}: catalog image removed`) };
  },
};
