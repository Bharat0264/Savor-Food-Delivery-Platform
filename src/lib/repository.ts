import { State, Status, Order, CartItem } from "./model";
import { freshSeed } from "./seed";
export interface DemoRepository {
  load(): State;
  save(state: State): void;
  reset(): State;
}
export const repository: DemoRepository = {
  load() {
    try {
      const raw = localStorage.getItem("savor-demo-v1");
      if (!raw) return freshSeed();
      const data = JSON.parse(raw);
      if (
        !Array.isArray(data.orders) ||
        !Array.isArray(data.products) ||
        !data.cart ||
        !data.settings
      )
        return freshSeed();
      return {
        ...data,
        refunds: data.refunds || [],
        deductionNotes: data.deductionNotes || "",
        selection: {
          merchantId: data.selection?.merchantId || "m1",
          branchId: data.selection?.branchId || "b1",
          riderId: data.selection?.riderId || "r1",
        },
        branches: data.branches || freshSeed().branches,
        merchantManagers: data.merchantManagers || freshSeed().merchantManagers,
        merchants: data.merchants.map((m: State["merchants"][number]) => ({
          ...m,
          open: m.open ?? true,
          lifecycle:
            m.lifecycle || (m.approved ? "approved" : "pending"),
        })),
      } as State;
    } catch {
      return freshSeed();
    }
  },
  save(state) {
    try {
      localStorage.setItem("savor-demo-v1", JSON.stringify(state));
    } catch {
      /* Session remains usable if storage is blocked or full. */
    }
  },
  reset() {
    try {
      localStorage.removeItem("savor-demo-v1");
    } catch {}
    return freshSeed();
  },
};
export const nextStatus: Partial<Record<Status, Status>> = {
  Pending: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Out for delivery",
  "Out for delivery": "Delivered",
};
export function updateOrder(
  state: State,
  id: string,
  status: Status,
  riderId?: string,
): State {
  const order = state.orders.find((o) => o.id === id);
  if (!order) throw Error("Order not found");
  if (
    status !== order.status &&
    status !== "Cancelled" &&
    nextStatus[order.status] !== status
  )
    throw Error("This order cannot move to that status.");
  if (
    ["Delivered", "Cancelled"].includes(order.status) &&
    status !== order.status &&
    status !== "Cancelled"
  )
    throw Error("This order is already closed.");
  if (riderId) {
    const rider = state.riders.find((r) => r.id === riderId);
    if (
      !rider?.enabled ||
      !rider.merchantIds.includes(order.merchantId) ||
      rider.availability === "Offline"
    )
      throw Error("Choose an available rider associated with this merchant.");
    if (
      state.orders.some(
        (o) =>
          o.id !== id &&
          o.riderId === riderId &&
          !["Delivered", "Cancelled"].includes(o.status),
      )
    )
      throw Error("This rider already has an active assignment.");
  }
  if (status === "Out for delivery" && !(riderId || order.riderId))
    throw Error("Assign a rider before pickup.");
  const orders = state.orders.map((o) =>
    o.id === id ? { ...o, status, riderId: riderId || o.riderId } : o,
  );
  const riders = state.riders.map((r) => {
    if (r.id !== riderId && r.id !== order.riderId) return r;
    const busy = orders.some(
      (o) =>
        o.riderId === r.id && !["Delivered", "Cancelled"].includes(o.status),
    );
    return {
      ...r,
      availability: busy ? ("Busy" as const) : ("Available" as const),
    };
  });
  const restock =
    status === "Cancelled" &&
    !["Cancelled", "Delivered"].includes(order.status);
  return {
    ...state,
    orders,
    riders,
    products: restock
      ? state.products.map((p) => ({
          ...p,
          stock:
            p.stock +
            order.items
              .filter((i) => i.productId === p.id)
              .reduce((n, i) => n + i.quantity, 0),
        }))
      : state.products,
    audit: [
      {
        id: `audit-${state.audit.length}`,
        message: `${id}: ${status}${riderId ? " · Rider assigned" : ""}`,
      },
      ...state.audit,
    ],
  };
}
export function orderTotal(items: Order["items"], discount = 0) {
  return (
    Math.max(
      0,
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) - discount,
    ) + 40
  );
}
export type CheckoutInput = {
  addressId: string;
  instructions: string;
  payment: string;
  discount: number;
  now: string;
};
export function placeOrder(
  state: State,
  input: CheckoutInput,
): { state: State; order: Order } {
  const cart = state.cart;
  const address = state.addresses.find((a) => a.id === input.addressId);
  if (!cart.items.length) throw Error("Your bag is empty.");
  if (!address) throw Error("Choose a delivery address.");
  if (
    !state.settings.storeOpen ||
    !state.merchants.find((m) => m.id === cart.merchantId)?.open
  )
    throw Error("Demo ordering is paused in business settings.");
  if (!state.merchants.find((m) => m.id === cart.merchantId)?.approved)
    throw Error("This merchant is currently unavailable.");
  const grouped = new Map<string, number>();
  cart.items.forEach((i) =>
    grouped.set(i.productId, (grouped.get(i.productId) || 0) + i.quantity),
  );
  for (const [id, qty] of grouped) {
    const product = state.products.find((p) => p.id === id);
    if (
      !product ||
      product.merchantId !== cart.merchantId ||
      qty < 1 ||
      qty > product.stock
    )
      throw Error("An item is no longer available in that quantity.");
  }
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount =
    subtotal >= 499 &&
    state.promotions.some((p) => p.code === "FIRSTBITE" && p.enabled)
      ? Math.min(100, input.discount)
      : 0;
  const order: Order = {
    id: `SV${1043 + state.orders.length}`,
    merchantId: cart.merchantId,
    customerId: state.customer.id,
    items: cart.items.map((i) => ({ ...i })),
    status: "Pending",
    address: address.line,
    instructions: input.instructions,
    payment: input.payment,
    total: orderTotal(cart.items, discount),
    discount,
    otp: String(4000 + state.orders.length * 17).slice(-4),
    createdAt: input.now,
  };
  return {
    order,
    state: {
      ...state,
      orders: [order, ...state.orders],
      products: state.products.map((p) => ({
        ...p,
        stock: p.stock - (grouped.get(p.id) || 0),
      })),
      cart: { merchantId: "", items: [] },
      notifications: [
        {
          id: `n${state.notifications.length}`,
          title: `${order.id} placed. Your merchant has been notified.`,
          read: false,
        },
        ...state.notifications,
      ],
      audit: [
        {
          id: `audit-${state.audit.length}`,
          message: `${order.id}: Demo order placed`,
        },
        ...state.audit,
      ],
    },
  };
}
export function verifyDelivery(
  state: State,
  id: string,
  riderId: string,
  otp: string,
): State {
  const order = state.orders.find((o) => o.id === id);
  const rider = state.riders.find((r) => r.id === riderId);
  if (
    !order ||
    !rider?.enabled ||
    order.riderId !== riderId ||
    !rider.merchantIds.includes(order.merchantId)
  )
    throw Error("This delivery is not assigned to this rider.");
  if (order.status !== "Out for delivery") throw Error("Confirm pickup first.");
  if (order.otp !== otp)
    throw Error("That demo OTP doesn’t match. Please try again.");
  return updateOrder(state, id, "Delivered");
}
export function addCartItem(
  state: State,
  merchantId: string,
  item: CartItem,
  replace = false,
): State {
  if (
    state.cart.items.length &&
    state.cart.merchantId !== merchantId &&
    !replace
  )
    throw Error("Confirm replacement before switching merchants.");
  const items = replace ? [] : state.cart.items;
  const existing = items.find(
    (i) => i.productId === item.productId && i.option === item.option,
  );
  return {
    ...state,
    cart: {
      merchantId,
      items: existing
        ? items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + item.quantity } : i,
          )
        : [...items, item],
    },
  };
}
