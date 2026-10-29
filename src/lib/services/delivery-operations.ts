import { Order, State, Status } from "../model";

type Actor = "merchant" | "rider" | "admin" | "customer";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const event = (state: State, orderId: string, actor: Actor | "system", type: string, message: string, reason?: string) => ({ ...state, orderEvents: [{ id: id("event"), orderId, actor, type, message, reason, createdAt: new Date().toISOString() }, ...(state.orderEvents || [])], notifications: [{ id: id("notice"), title: message, read: false }, ...state.notifications], audit: [{ id: id("audit"), message }, ...state.audit] });
const get = (state: State, orderId: string) => { const order = state.orders.find((item) => item.id === orderId); if (!order) throw Error("Order not found."); return order; };
const save = (state: State, order: Order, actor: Actor | "system", type: string, message: string, reason?: string) => event({ ...state, orders: state.orders.map((item) => item.id === order.id ? order : item) }, order.id, actor, type, message, reason);
export const deliveryOperations = {
  cancel(state: State, actor: "customer" | "merchant" | "admin", orderId: string, reason: string) {
    const order = get(state, orderId); if (!reason.trim()) throw Error("A cancellation reason is required."); if (["Delivered", "Cancelled"].includes(order.status)) throw Error("This order can no longer be cancelled.");
    if (actor === "customer" && !["Pending", "Accepted"].includes(order.status)) throw Error("Customer cancellation is no longer eligible after preparation starts.");
    const restore = ["Pending", "Accepted"].includes(order.status);
    const inventory = restore ? state.inventory.map((record) => { const quantity = order.items.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + item.quantity, 0); return record.branchId === order.branchId && quantity ? { ...record, quantity: record.quantity + quantity } : record; }) : state.inventory;
    const riders = state.riders.map((rider) => rider.id === order.riderId ? { ...rider, availability: "Available" as const } : rider);
    return event({ ...state, inventory, riders, orders: state.orders.map((item) => item.id === orderId ? { ...item, status: "Cancelled", deliveryState: "unassigned", cancellationReason: reason, refundStatus: item.paymentStatus === "Simulated paid" ? "pending" : item.refundStatus } : item) }, orderId, actor, "order.cancelled", `${orderId}: order cancelled`, reason);
  },
  refund(state: State, actor: "merchant" | "admin", orderId: string, amountPaise: number, reason: string, outcome: "completed" | "failed" = "completed") {
    const order = get(state, orderId); if (!reason.trim() || !Number.isSafeInteger(amountPaise) || amountPaise < 1) throw Error("Use a valid refund amount and reason."); if (order.paymentStatus !== "Simulated paid") throw Error("Only paid orders can be refunded.");
    const refunded = state.refunds.filter((refund) => refund.orderId === orderId && refund.status === "Simulated").reduce((sum, refund) => sum + refund.amountPaise, 0); if (refunded + amountPaise > order.totalPaise) throw Error("Refund exceeds the remaining refundable amount.");
    if (outcome === "failed") return event(save(state, order, actor, "refund.failed", `${orderId}: refund failed`, reason), orderId, actor, "refund.failed", `${orderId}: refund failed`, reason);
    const refund = { id: id("refund"), orderId, amountPaise, status: "Simulated" as const, reason };
    return event({ ...state, refunds: [...state.refunds, refund], orders: state.orders.map((item) => item.id === orderId ? { ...item, refundStatus: refunded + amountPaise === order.totalPaise ? "refunded" : "pending" } : item) }, orderId, actor, "refund.completed", `${orderId}: simulated refund completed`, reason);
  },
  merchantTransition(state: State, merchantId: string, orderId: string, action: "accept" | "reject" | "prepare" | "ready" | "delay", reason?: string) {
    const order = get(state, orderId); if (order.merchantId !== merchantId) throw Error("This order belongs to another merchant.");
    const next: Record<string, Status> = { accept: "Accepted", prepare: "Preparing", ready: "Ready", reject: "Cancelled", delay: order.status };
    if ((action === "accept" && order.status !== "Pending") || (action === "prepare" && order.status !== "Accepted") || (action === "ready" && order.status !== "Preparing") || (action === "reject" && !["Pending", "Accepted"].includes(order.status))) throw Error("This order cannot take that operational action.");
    return save(state, { ...order, status: next[action], cancellationReason: action === "reject" ? reason || "Merchant rejected" : order.cancellationReason }, "merchant", `order.${action}`, `${order.id}: ${action === "prepare" ? "preparation started" : action}` , reason);
  },
  assign(state: State, actor: "merchant" | "admin", merchantId: string, orderId: string, riderId: string) {
    const order = get(state, orderId); const rider = state.riders.find((item) => item.id === riderId);
    if (actor === "merchant" && order.merchantId !== merchantId) throw Error("This order belongs to another merchant.");
    if (order.status !== "Ready" || !rider?.enabled || rider.availability !== "Available" || !rider.merchantIds.includes(order.merchantId) || state.orders.some((item) => item.id !== orderId && item.riderId === riderId && !["Delivered", "Cancelled"].includes(item.status))) throw Error("Choose an eligible available rider for a ready order.");
    const riders = state.riders.map((item) => item.id === riderId ? { ...item, availability: "Busy" as const } : item);
    return event({ ...state, riders, orders: state.orders.map((item) => item.id === orderId ? { ...item, riderId, deliveryState: "assigned", otpExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), otpAttempts: 0, otpConsumed: false } : item) }, orderId, actor, "delivery.assigned", `${orderId}: rider assigned`);
  },
  riderTransition(state: State, riderId: string, orderId: string, action: "accept" | "decline" | "arrive_pickup" | "pickup" | "arrive_destination") {
    const order = get(state, orderId); if (order.riderId !== riderId) throw Error("This delivery is not assigned to this rider."); const rider = state.riders.find((item) => item.id === riderId); if (!rider?.enabled) throw Error("This rider is unavailable.");
    const map = { accept: "accepted", arrive_pickup: "at_pickup", pickup: "picked_up", arrive_destination: "at_destination" } as const;
    if (action === "decline") return event({ ...state, riders: state.riders.map((item) => item.id === riderId ? { ...item, availability: "Available" as const } : item), orders: state.orders.map((item) => item.id === orderId ? { ...item, riderId: undefined, deliveryState: "unassigned" } : item) }, orderId, "rider", "delivery.declined", `${orderId}: rider declined assignment`);
    const expected: Record<string, string> = { accept: "assigned", arrive_pickup: "accepted", pickup: "at_pickup", arrive_destination: "picked_up" }; if (order.deliveryState !== expected[action]) throw Error("This delivery step is not available yet.");
    return save(state, { ...order, deliveryState: map[action], status: action === "pickup" ? "Out for delivery" : order.status }, "rider", `delivery.${action}`, `${orderId}: rider ${action.replace("_", " ")}`);
  },
  verifyOtp(state: State, riderId: string, orderId: string, otp: string) {
    const order = get(state, orderId); if (order.riderId !== riderId || order.deliveryState !== "at_destination" || order.status === "Delivered") throw Error("OTP verification is not available."); if (order.otpConsumed || (order.otpExpiresAt && Date.now() > new Date(order.otpExpiresAt).getTime())) throw Error("This delivery OTP has expired.");
    if ((order.otpAttempts || 0) >= 3) throw Error("Too many OTP attempts.");
    if (order.otp !== otp) return save(state, { ...order, otpAttempts: (order.otpAttempts || 0) + 1 }, "rider", "otp.rejected", `${orderId}: OTP verification rejected`);
    return event({ ...state, riders: state.riders.map((item) => item.id === riderId ? { ...item, availability: "Available" as const } : item), orders: state.orders.map((item) => item.id === orderId ? { ...item, status: "Delivered", deliveryState: "at_destination", otpConsumed: true } : item) }, orderId, "rider", "delivery.completed", `${orderId}: delivery completed and settlement eligible`);
  },
};
