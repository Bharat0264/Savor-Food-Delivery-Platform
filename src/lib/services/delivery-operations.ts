import { DeliveryAssignment, Order, State, Status } from "../model";
import { trackingService } from "./tracking";

type Actor = "merchant" | "rider" | "admin" | "customer";
type AssignmentActor = "merchant" | "rider" | "admin" | "system";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const activeAssignment = (assignment: DeliveryAssignment) => ["pending", "accepted"].includes(assignment.status);
const assignments = (state: State) => state.assignments || [];
const assignmentEvents = (state: State) => state.assignmentEvents || [];
const now = () => new Date().toISOString();
const get = (state: State, orderId: string) => { const order = state.orders.find((item) => item.id === orderId); if (!order) throw Error("Order not found."); return order; };
const notice = (state: State, orderId: string, actor: Actor | "system", type: string, message: string, reason?: string) => ({ ...state, orderEvents: [{ id: id("event"), orderId, actor, type, message, reason, createdAt: now() }, ...(state.orderEvents || [])], notifications: [{ id: id("notice"), title: message, read: false }, ...state.notifications], audit: [{ id: id("audit"), message }, ...state.audit] });
const assignmentAudit = (state: State, assignment: DeliveryAssignment, actor: AssignmentActor, action: string, previousValue?: string, reason?: string) => ({ ...state, assignmentEvents: [{ id: id("assignment-event"), orderId: assignment.orderId, assignmentId: assignment.id, actor, action, previousValue, newValue: assignment.status, reason, createdAt: now() }, ...assignmentEvents(state)] });
const updateOrder = (state: State, order: Order) => ({ ...state, orders: state.orders.map((item) => item.id === order.id ? order : item) });
const updateAssignment = (state: State, assignment: DeliveryAssignment) => ({ ...state, assignments: assignments(state).map((item) => item.id === assignment.id ? assignment : item) });
const riderCapacity = 1;
const riderHasActive = (state: State, riderId: string, exceptOrderId?: string) => assignments(state).filter((item) => item.riderId === riderId && item.orderId !== exceptOrderId && activeAssignment(item)).length >= riderCapacity;
const refreshAvailability = (state: State): State => ({ ...state, riders: state.riders.map((rider) => !rider.enabled ? rider : { ...rider, availability: riderHasActive(state, rider.id) ? "Busy" as const : rider.availability === "Busy" ? "Available" as const : rider.availability }) });
const merchantMembership = (state: State, riderId: string, merchantId: string, branchId: string) => (state.riderMemberships || []).some((membership) => membership.riderId === riderId && membership.merchantId === merchantId && membership.status === "active" && membership.branchIds.includes(branchId));
const eligible = (state: State, order: Order, riderId: string) => {
  const rider = state.riders.find((item) => item.id === riderId);
  return Boolean(rider?.enabled && rider.availability === "Available" && merchantMembership(state, riderId, order.merchantId, order.branchId) && !riderHasActive(state, riderId));
};
const current = (state: State, orderId: string) => assignments(state).find((item) => item.orderId === orderId && activeAssignment(item));
const rotateOtp = (order: Order) => ({ ...order, otp: String((Number(order.otp || "0000") + 1379) % 10000).padStart(4, "0"), otpAttempts: 0, otpConsumed: false, otpExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });

export const deliveryOperations = {
  eligibleRiders(state: State, orderId: string) {
    const order = get(state, orderId);
    return state.riders.map((rider) => ({ rider, eligible: eligible(state, order, rider.id), reason: eligible(state, order, rider.id) ? undefined : !rider.enabled ? "Membership unavailable" : rider.availability !== "Available" ? `Currently ${rider.availability.toLowerCase()}` : !merchantMembership(state, rider.id, order.merchantId, order.branchId) ? "Not authorized for this branch" : "At workload capacity" }));
  },
  cancel(state: State, actor: "customer" | "merchant" | "admin", orderId: string, reason: string) {
    const order = get(state, orderId); if (!reason.trim()) throw Error("A cancellation reason is required."); if (["Delivered", "Cancelled"].includes(order.status)) throw Error("This order can no longer be cancelled.");
    if (actor === "customer" && !["Pending", "Accepted"].includes(order.status)) throw Error("Customer cancellation is no longer eligible after preparation starts.");
    const restore = ["Pending", "Accepted"].includes(order.status);
    const inventory = restore ? state.inventory.map((record) => { const quantity = order.items.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + item.quantity, 0); return record.branchId === order.branchId && quantity ? { ...record, quantity: record.quantity + quantity } : record; }) : state.inventory;
    const assignment = current(state, orderId);
    let next: State = { ...state, inventory, orders: state.orders.map((item) => item.id === orderId ? { ...item, status: "Cancelled", riderId: undefined, deliveryState: "unassigned", cancellationReason: reason, refundStatus: item.paymentStatus === "Simulated paid" ? "pending" : item.refundStatus } : item) };
    if (assignment) { const closed = { ...assignment, status: "cancelled" as const, closedAt: now(), cancellationReason: reason }; next = assignmentAudit(updateAssignment(next, closed), closed, actor === "admin" ? "admin" : "system", "assignment.cancelled", assignment.status, reason); }
    next = refreshAvailability(next);
    return notice(next, orderId, actor, "order.cancelled", `${orderId}: order cancelled`, reason);
  },
  refund(state: State, actor: "merchant" | "admin", orderId: string, amountPaise: number, reason: string, outcome: "completed" | "failed" = "completed") {
    const order = get(state, orderId); if (!reason.trim() || !Number.isSafeInteger(amountPaise) || amountPaise < 1) throw Error("Use a valid refund amount and reason."); if (order.paymentStatus !== "Simulated paid") throw Error("Only paid orders can be refunded.");
    const refunded = state.refunds.filter((refund) => refund.orderId === orderId && refund.status === "Simulated").reduce((sum, refund) => sum + refund.amountPaise, 0); if (refunded + amountPaise > order.totalPaise) throw Error("Refund exceeds the remaining refundable amount.");
    if (outcome === "failed") return notice(state, orderId, actor, "refund.failed", `${orderId}: refund failed`, reason);
    const refund = { id: id("refund"), orderId, amountPaise, status: "Simulated" as const, reason };
    return notice({ ...state, refunds: [...state.refunds, refund], orders: state.orders.map((item) => item.id === orderId ? { ...item, refundStatus: refunded + amountPaise === order.totalPaise ? "refunded" : "pending" } : item) }, orderId, actor, "refund.completed", `${orderId}: simulated refund completed`, reason);
  },
  merchantTransition(state: State, merchantId: string, orderId: string, action: "accept" | "reject" | "prepare" | "ready" | "delay", reason?: string) {
    const order = get(state, orderId); if (order.merchantId !== merchantId) throw Error("This order belongs to another merchant.");
    const next: Record<string, Status> = { accept: "Accepted", prepare: "Preparing", ready: "Ready", reject: "Cancelled", delay: order.status };
    if ((action === "accept" && order.status !== "Pending") || (action === "prepare" && order.status !== "Accepted") || (action === "ready" && order.status !== "Preparing") || (action === "reject" && !["Pending", "Accepted"].includes(order.status))) throw Error("This order cannot take that operational action.");
    return notice(updateOrder(state, { ...order, status: next[action], cancellationReason: action === "reject" ? reason || "Merchant rejected" : order.cancellationReason }), orderId, "merchant", `order.${action}`, `${order.id}: ${action === "prepare" ? "preparation started" : action}`, reason);
  },
  assign(state: State, actor: "merchant" | "admin", merchantId: string, orderId: string, riderId: string, reason?: string) {
    const order = get(state, orderId); if (actor === "merchant" && order.merchantId !== merchantId) throw Error("This order belongs to another merchant."); if (order.status !== "Ready" || order.deliveryState === "picked_up" || ["Delivered", "Cancelled"].includes(order.status)) throw Error("This order is not eligible for assignment."); if (current(state, orderId)) throw Error("This order already has an active assignment."); if (!eligible(state, order, riderId)) throw Error("Choose an eligible available rider for this ready order.");
    const assignment: DeliveryAssignment = { id: id("assignment"), orderId, merchantId: order.merchantId, branchId: order.branchId, riderId, assignedBy: actor, assignedAt: now(), status: "pending", reassignmentReason: reason };
    let next: State = { ...state, assignments: [...assignments(state), assignment], orders: state.orders.map((item) => item.id === orderId ? { ...item, riderId, deliveryState: "assigned", otpExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), otpAttempts: 0, otpConsumed: false } : item) };
    next = trackingService.initialize(next, orderId, assignment.id, riderId, order.branchId); next = refreshAvailability(next); next = assignmentAudit(next, assignment, actor, "assignment.created", undefined, reason);
    return notice(next, orderId, actor, "delivery.assigned", `${orderId}: rider assigned`);
  },
  reassign(state: State, actor: "merchant" | "admin", merchantId: string, orderId: string, riderId: string, reason: string, custodyHandoverConfirmed = false) {
    if (!reason.trim()) throw Error("A reassignment reason is required."); const order = get(state, orderId); const previous = current(state, orderId);
    if (!previous || previous.riderId === riderId) throw Error("Choose a different rider for this active assignment."); if (actor === "merchant" && order.merchantId !== merchantId) throw Error("This order belongs to another merchant.");
    const afterPickup = ["picked_up", "at_destination"].includes(order.deliveryState || ""); if (afterPickup && (actor !== "admin" || !custodyHandoverConfirmed)) throw Error("Post-pickup reassignment requires an admin-confirmed custody handover.");
    if (!eligible({ ...state, assignments: assignments(state).map((item) => item.id === previous.id ? { ...item, status: "reassigned" as const } : item) }, order, riderId)) throw Error("Choose an eligible available rider for reassignment.");
    const closed = { ...previous, status: "reassigned" as const, closedAt: now(), reassignmentReason: reason, custodyHandoverConfirmed: afterPickup };
    const replacement: DeliveryAssignment = { id: id("assignment"), orderId, merchantId: order.merchantId, branchId: order.branchId, riderId, assignedBy: actor, assignedAt: now(), status: afterPickup ? "accepted" : "pending", acceptedAt: afterPickup ? now() : undefined, previousAssignmentId: previous.id, reassignmentReason: reason, custodyHandoverConfirmed: afterPickup || undefined };
    let next: State = { ...state, assignments: assignments(state).map((item) => item.id === previous.id ? closed : item).concat(replacement), orders: state.orders.map((item) => item.id === orderId ? rotateOtp({ ...item, riderId, deliveryState: afterPickup ? "picked_up" : "assigned" }) : item) };
    next = assignmentAudit(next, closed, actor, "assignment.reassigned", previous.status, reason); next = assignmentAudit(next, replacement, actor, afterPickup ? "assignment.custody_handover" : "assignment.created", undefined, reason); next = refreshAvailability(next);
    return notice(next, orderId, actor, actor === "admin" ? "delivery.admin_reassigned" : "delivery.reassigned", `${orderId}: rider reassigned`, reason);
  },
  cancelAssignment(state: State, actor: "merchant" | "admin", merchantId: string, orderId: string, reason: string) {
    if (!reason.trim()) throw Error("An assignment cancellation reason is required."); const order = get(state, orderId); const assignment = current(state, orderId); if (!assignment) throw Error("There is no active assignment to cancel."); if (actor === "merchant" && order.merchantId !== merchantId) throw Error("This order belongs to another merchant."); if (["picked_up", "at_destination"].includes(order.deliveryState || "")) throw Error("Use the custody handover exception after pickup.");
    const closed = { ...assignment, status: "cancelled" as const, closedAt: now(), cancellationReason: reason };
    let next = updateAssignment(updateOrder(state, { ...order, riderId: undefined, deliveryState: "unassigned" }), closed); next = assignmentAudit(next, closed, actor, "assignment.cancelled", assignment.status, reason); next = refreshAvailability(next);
    return notice(next, orderId, actor, "delivery.assignment_cancelled", `${orderId}: assignment cancelled`, reason);
  },
  riderTransition(state: State, riderId: string, orderId: string, action: "accept" | "decline" | "arrive_pickup" | "pickup" | "arrive_destination") {
    const order = get(state, orderId); const assignment = current(state, orderId); if (order.riderId !== riderId || !assignment || assignment.riderId !== riderId) throw Error("This delivery is not assigned to this rider."); const rider = state.riders.find((item) => item.id === riderId); if (!rider?.enabled || !merchantMembership(state, riderId, order.merchantId, order.branchId)) throw Error("This rider is unavailable.");
    if (action === "decline") { if (assignment.status !== "pending") throw Error("This assignment can no longer be declined."); const declined = { ...assignment, status: "declined" as const, declinedAt: now(), closedAt: now() }; let next = updateAssignment(updateOrder(state, { ...order, riderId: undefined, deliveryState: "unassigned" }), declined); next = assignmentAudit(next, declined, "rider", "assignment.declined", assignment.status); next = refreshAvailability(next); return notice(next, orderId, "rider", "delivery.declined", `${orderId}: rider declined assignment`); }
    const expected: Record<string, string> = { accept: "assigned", arrive_pickup: "accepted", pickup: "at_pickup", arrive_destination: "picked_up" }; if (order.deliveryState !== expected[action]) throw Error("This delivery step is not available yet."); if (action === "accept" && assignment.status !== "pending") throw Error("This assignment has already been handled.");
    const nextAssignment = action === "accept" ? { ...assignment, status: "accepted" as const, acceptedAt: now() } : assignment; const map = { accept: "accepted", arrive_pickup: "at_pickup", pickup: "picked_up", arrive_destination: "at_destination" } as const;
    let next = updateOrder(updateAssignment(state, nextAssignment), { ...order, deliveryState: map[action], status: action === "pickup" ? "Out for delivery" : order.status }); if (action === "accept") { next = trackingService.start(next, orderId, riderId); next = assignmentAudit(next, nextAssignment, "rider", "assignment.accepted", assignment.status); } if (action === "arrive_pickup") next = trackingService.arrive(next, orderId, riderId); if (action === "pickup") { next = trackingService.beginDelivery(next, orderId, riderId); next = trackingService.start(next, orderId, riderId); } if (action === "arrive_destination") next = trackingService.arrive(next, orderId, riderId); return notice(next, orderId, "rider", `delivery.${action}`, `${orderId}: rider ${action.replace("_", " ")}`);
  },
  verifyOtp(state: State, riderId: string, orderId: string, otp: string) {
    const order = get(state, orderId); const assignment = current(state, orderId); if (order.riderId !== riderId || assignment?.riderId !== riderId || order.deliveryState !== "at_destination" || order.status === "Delivered") throw Error("OTP verification is not available."); if (order.otpConsumed || (order.otpExpiresAt && Date.now() > new Date(order.otpExpiresAt).getTime())) throw Error("This delivery OTP has expired."); if ((order.otpAttempts || 0) >= 3) throw Error("Too many OTP attempts.");
    if (order.otp !== otp) return notice(updateOrder(state, { ...order, otpAttempts: (order.otpAttempts || 0) + 1 }), orderId, "rider", "otp.rejected", `${orderId}: OTP verification rejected`);
    const complete = assignment ? { ...assignment, status: "completed" as const, closedAt: now() } : undefined; let next = complete ? updateAssignment({ ...state, orders: state.orders.map((item) => item.id === orderId ? { ...item, status: "Delivered", deliveryState: "at_destination", otpConsumed: true } : item) }, complete) : state; if (complete) next = assignmentAudit(next, complete, "rider", "assignment.completed", assignment.status); next = refreshAvailability(next);
    next = trackingService.stop(next, orderId, "OTP verified", true); return notice(next, orderId, "rider", "delivery.completed", `${orderId}: delivery completed and settlement eligible`);
  },
};
