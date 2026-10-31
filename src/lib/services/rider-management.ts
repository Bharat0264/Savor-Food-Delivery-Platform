import { Rider, RiderMembership, State } from "../model";
import type { DemoActor } from "./merchant-management";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const assertScope = (state: State, actor: DemoActor, merchantId: string) => { if (actor !== "admin" && state.selection.merchantId !== merchantId) throw Error("This demo manager can only manage the selected merchant."); };
const audit = (state: State, message: string) => ({ audit: [{ id: id("audit"), message }, ...state.audit], notifications: [{ id: id("notice"), title: message, read: false }, ...state.notifications] });
export const riderManagementService = {
  create(state: State, actor: DemoActor, merchantId: string, input: Pick<Rider, "name" | "phone">, branchIds: string[]) {
    assertScope(state, actor, merchantId); if (!input.name.trim() || branchIds.some((branchId) => state.branches.find((branch) => branch.id === branchId)?.merchantId !== merchantId)) throw Error("Provide a name and branches from this merchant.");
    const rider: Rider = { id: id("rider"), name: input.name.trim(), phone: input.phone, merchantIds: [merchantId], branchIds, availability: "Available", enabled: true, status: "active" }; const membership: RiderMembership = { id: id("membership"), riderId: rider.id, merchantId, branchIds, status: "active", createdAt: new Date().toISOString() };
    return { ...state, riders: [...state.riders, rider], riderMemberships: [...state.riderMemberships, membership], ...audit(state, `${rider.name}: rider created`) };
  },
  setMembershipStatus(state: State, actor: DemoActor, membershipId: string, status: RiderMembership["status"]) {
    const membership = state.riderMemberships.find((item) => item.id === membershipId); if (!membership) throw Error("Rider membership not found."); assertScope(state, actor, membership.merchantId);
    const active = state.orders.some((order) => order.riderId === membership.riderId && order.merchantId === membership.merchantId && !["Delivered", "Cancelled"].includes(order.status)); if (active && status === "archived") throw Error("Reassign active deliveries before archiving this membership.");
    return { ...state, riderMemberships: state.riderMemberships.map((item) => item.id === membershipId ? { ...item, status } : item), riders: state.riders.map((rider) => rider.id === membership.riderId ? { ...rider, enabled: status === "active", status, availability: status === "active" ? rider.availability : "Offline" } : rider), ...audit(state, `${membership.riderId}: membership ${status}`) };
  },
  eligible(state: State, merchantId: string, branchId: string) { return state.riders.filter((rider) => rider.enabled && rider.availability === "Available" && state.riderMemberships.some((membership) => membership.riderId === rider.id && membership.merchantId === merchantId && membership.status === "active" && membership.branchIds.includes(branchId))); },
};
