import { Address, CartItem, PaymentAttempt, State } from "../model";
import { catalogForBranch } from "./catalog-management";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export const DEMO_DELIVERY_FEE_PAISE = 4000;
export type CartSelection = { productId: string; variantId?: string; addonIds?: string[]; quantity: number };
export type CheckoutQuote = { subtotalPaise: number; deliveryFeePaise: number; taxPaise: number; discountPaise: number; totalPaise: number; promotionCode?: string; priceChanged: boolean };
export type CheckoutRequest = { addressId: string; instructions: string; paymentMethod: string; idempotencyKey: string; promotionCode?: string; paymentOutcome?: "success" | "failure" | "pending"; now?: string };

const lineKey = (item: Pick<CartItem, "productId" | "variantId" | "addonIds">) => `${item.productId}:${item.variantId || "base"}:${[...item.addonIds].sort().join(",")}`;
const productFor = (state: State, merchantId: string, branchId: string, productId: string) => catalogForBranch(state, merchantId, branchId).find((item) => item.id === productId);
function itemFrom(state: State, merchantId: string, branchId: string, selection: CartSelection): CartItem {
  const product = productFor(state, merchantId, branchId, selection.productId);
  if (!product || !product.available || selection.quantity < 1 || !Number.isInteger(selection.quantity)) throw Error("This product is currently unavailable.");
  const variant = selection.variantId ? product.variants.find((item) => item.id === selection.variantId && item.active) : undefined;
  if (selection.variantId && !variant) throw Error("That product option is no longer available.");
  const addonIds = selection.addonIds || [];
  const addons = product.customizationGroups.flatMap((group) => group.addons.filter((addon) => addon.active && addonIds.includes(addon.id)));
  if (addons.length !== new Set(addonIds).size) throw Error("One or more selected add-ons are no longer available.");
  for (const group of product.customizationGroups) {
    const count = addons.filter((addon) => group.addons.some((item) => item.id === addon.id)).length;
    if (count < group.minSelections || count > group.maxSelections) throw Error(`${group.name} needs ${group.minSelections}–${group.maxSelections} selections.`);
  }
  if (selection.quantity > product.stock) throw Error("Requested quantity exceeds available stock.");
  const unitPricePaise = variant?.pricePaise ?? product.pricePaise;
  const addonTotalPaise = addons.reduce((sum, addon) => sum + addon.pricePaise, 0);
  return { id: id("cart-line"), productId: product.id, name: product.name, image: product.image, variantId: variant?.id, variantName: variant?.name, addonIds, addonNames: addons.map((addon) => addon.name), unitPricePaise, addonTotalPaise, lineTotalPaise: (unitPricePaise + addonTotalPaise) * selection.quantity, quantity: selection.quantity, option: [variant?.name, ...addons.map((addon) => addon.name)].filter(Boolean).join(" + ") || "Standard" };
}
function validateMerchantBranch(state: State, merchantId: string, branchId: string) {
  const merchant = state.merchants.find((item) => item.id === merchantId);
  const branch = state.branches.find((item) => item.id === branchId && item.merchantId === merchantId);
  if (!merchant?.approved || !merchant.open || !state.settings.storeOpen || !branch?.acceptingOrders || !branch.deliveryAvailable) throw Error("This store is not accepting orders right now.");
  return { merchant, branch };
}
export const cartService = {
  add(state: State, merchantId: string, branchId: string, selection: CartSelection, replace = false) {
    const merchant = state.merchants.find((item) => item.id === merchantId);
    if (!merchant) throw Error("Merchant not found.");
    if (state.cart.items.length && (state.cart.merchantId !== merchantId || state.cart.branchId !== branchId) && !replace) throw Error("Confirm replacement before switching stores or branches.");
    const item = itemFrom(state, merchantId, branchId, selection);
    const items = replace ? [] : state.cart.items;
    const existing = items.find((candidate) => lineKey(candidate) === lineKey(item));
    const next = existing ? { ...existing, quantity: existing.quantity + item.quantity, lineTotalPaise: (existing.unitPricePaise + existing.addonTotalPaise) * (existing.quantity + item.quantity) } : item;
    if (next.quantity > (productFor(state, merchantId, branchId, item.productId)?.stock || 0)) throw Error("Requested quantity exceeds available stock.");
    return { ...state, cart: { merchantId, branchId, kind: merchant.kind, items: existing ? items.map((candidate) => candidate.id === existing.id ? next : candidate) : [...items, item], createdAt: state.cart.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() } };
  },
  setQuantity(state: State, lineId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 0) throw Error("Quantity must be a whole number.");
    const current = state.cart.items.find((item) => item.id === lineId);
    if (!current) throw Error("Cart item not found.");
    if (!quantity) return this.remove(state, lineId);
    const product = productFor(state, state.cart.merchantId, state.cart.branchId, current.productId);
    if (!product || quantity > product.stock) throw Error("Requested quantity exceeds available stock.");
    return { ...state, cart: { ...state.cart, updatedAt: new Date().toISOString(), items: state.cart.items.map((item) => item.id === lineId ? { ...item, quantity, lineTotalPaise: (item.unitPricePaise + item.addonTotalPaise) * quantity } : item) } };
  },
  remove(state: State, lineId: string) { const items = state.cart.items.filter((item) => item.id !== lineId); return { ...state, cart: { merchantId: items.length ? state.cart.merchantId : "", branchId: items.length ? state.cart.branchId : "", kind: items.length ? state.cart.kind : undefined, items, updatedAt: new Date().toISOString() } }; },
  clear(state: State) { return { ...state, cart: { merchantId: "", branchId: "", items: [] } }; },
  validate(state: State) {
    if (!state.cart.items.length) throw Error("Your bag is empty.");
    validateMerchantBranch(state, state.cart.merchantId, state.cart.branchId);
    const refreshed = state.cart.items.map((item) => itemFrom(state, state.cart.merchantId, state.cart.branchId, { productId: item.productId, variantId: item.variantId, addonIds: item.addonIds, quantity: item.quantity }));
    const priceChanged = refreshed.some((item, index) => item.unitPricePaise !== state.cart.items[index].unitPricePaise || item.addonTotalPaise !== state.cart.items[index].addonTotalPaise);
    return { items: refreshed, priceChanged };
  },
};

export const addressService = {
  save(state: State, input: Omit<Address, "id" | "line"> & { id?: string }) {
    if (!input.label.trim() || !input.city.trim() || !/^\d{6}$/.test(input.pin)) throw Error("Add a label, city, and valid six-digit PIN code.");
    const address: Address = { ...input, id: input.id || id("address"), line: [input.building, input.street, input.locality, input.city, input.state, input.pin].filter(Boolean).join(", ") };
    const addresses = state.addresses.filter((item) => item.id !== address.id).map((item) => input.default ? { ...item, default: false } : item);
    return { ...state, addresses: [...addresses, address] };
  },
  remove(state: State, addressId: string) { if (state.addresses.length <= 1) throw Error("Keep at least one delivery address."); return { ...state, addresses: state.addresses.filter((item) => item.id !== addressId) }; },
  serviceable(address: Address, branchCity: string) { return address.city.trim().toLowerCase() === branchCity.trim().toLowerCase() && /^560\d{3}$/.test(address.pin); },
};

export function quoteCart(state: State, promotionCode?: string): CheckoutQuote {
  const validated = cartService.validate(state);
  const subtotalPaise = validated.items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  let discountPaise = 0; let promotionCodeUsed: string | undefined;
  if (promotionCode) {
    const merchant = state.merchants.find((item) => item.id === state.cart.merchantId)!;
    const promo = state.promotions.find((item) => item.code.toUpperCase() === promotionCode.toUpperCase() && item.enabled);
    if (!promo || (promo.merchantId && promo.merchantId !== merchant.id) || (promo.branchId && promo.branchId !== state.cart.branchId) || (promo.kind && promo.kind !== merchant.kind) || (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) || (promo.usageLimit !== undefined && promo.usedCount >= promo.usageLimit) || subtotalPaise < promo.minOrderPaise) throw Error("This promo is not applicable to this order.");
    discountPaise = promo.type === "fixed" ? promo.valuePaise || 0 : Math.floor(subtotalPaise * (promo.percent || 0) / 100);
    discountPaise = Math.min(discountPaise, promo.maxDiscountPaise ?? discountPaise, subtotalPaise); promotionCodeUsed = promo.code;
  }
  return { subtotalPaise, deliveryFeePaise: DEMO_DELIVERY_FEE_PAISE, taxPaise: 0, discountPaise, totalPaise: Math.max(0, subtotalPaise + DEMO_DELIVERY_FEE_PAISE - discountPaise), promotionCode: promotionCodeUsed, priceChanged: validated.priceChanged };
}

export const checkoutService = {
  place(state: State, request: CheckoutRequest): { state: State; orderId?: string; payment: PaymentAttempt } {
    if (state.checkoutKeys.includes(request.idempotencyKey)) throw Error("This checkout was already processed.");
    const address = state.addresses.find((item) => item.id === request.addressId); if (!address) throw Error("Choose a delivery address.");
    const { branch } = validateMerchantBranch(state, state.cart.merchantId, state.cart.branchId); if (!addressService.serviceable(address, branch.city)) throw Error("This address is outside the simulated delivery area.");
    const quote = quoteCart(state, request.promotionCode); if (quote.priceChanged) throw Error("Prices changed in your bag. Please review the updated total before placing the order.");
    const payment: PaymentAttempt = { id: id("payment"), idempotencyKey: request.idempotencyKey, method: request.paymentMethod, amountPaise: quote.totalPaise, status: request.paymentOutcome === "failure" ? "failed" : request.paymentOutcome === "pending" ? "pending" : "confirmed", createdAt: request.now || new Date().toISOString() };
    const tagged = { ...state, checkoutKeys: [...state.checkoutKeys, request.idempotencyKey], paymentAttempts: [payment, ...state.paymentAttempts] };
    if (payment.status !== "confirmed") return { state: tagged, payment };
    const validated = cartService.validate(tagged); const orderId = `SV${1043 + state.orders.length}`;
    const order = { id: orderId, merchantId: tagged.cart.merchantId, branchId: tagged.cart.branchId, customerId: tagged.customer.id, items: validated.items, status: "Pending" as const, address: address.line, instructions: request.instructions, payment: request.paymentMethod, paymentStatus: "Simulated paid" as const, subtotalPaise: quote.subtotalPaise, deliveryFeePaise: quote.deliveryFeePaise, taxPaise: quote.taxPaise, discountPaise: quote.discountPaise, totalPaise: quote.totalPaise, otp: String(4000 + tagged.orders.length * 17).slice(-4), createdAt: request.now || new Date().toISOString() };
    const inventory = tagged.inventory.map((record) => { const qty = validated.items.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + item.quantity, 0); return record.branchId === tagged.cart.branchId && qty ? { ...record, quantity: record.quantity - qty } : record; });
    const promotions = quote.promotionCode ? tagged.promotions.map((item) => item.code === quote.promotionCode ? { ...item, usedCount: item.usedCount + 1 } : item) : tagged.promotions;
    return { orderId, payment, state: { ...tagged, inventory, promotions, orders: [order, ...tagged.orders], cart: { merchantId: "", branchId: "", items: [] }, notifications: [{ id: id("notification"), title: `${orderId} placed. Your merchant has been notified.`, read: false }, ...tagged.notifications], audit: [{ id: id("audit"), message: `${orderId}: demo checkout confirmed` }, ...tagged.audit] } };
  },
};
