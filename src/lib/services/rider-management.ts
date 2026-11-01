import { Rider, RiderMembership, State } from "../model";
import type { DemoActor } from "./merchant-management";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const assertScope = (state: State, actor: DemoActor, merchantId: string) => {
  if (actor !== "admin" && state.selection.merchantId !== merchantId)
    throw Error("This demo manager can only manage the selected merchant.");
};
const audit = (state: State, message: string) => ({
  audit: [{ id: id("audit"), message }, ...state.audit],
  notifications: [
    { id: id("notice"), title: message, read: false },
    ...state.notifications,
  ],
});
const memberships = (state: State) => state.riderMemberships || [];
const memberScope = (state: State, actor: DemoActor, riderId: string) => {
  const riderMemberships = memberships(state).filter(
    (item) => item.riderId === riderId,
  );
  if (!riderMemberships.length) throw Error("Rider membership not found.");
  if (
    actor !== "admin" &&
    !riderMemberships.some(
      (item) => item.merchantId === state.selection.merchantId,
    )
  )
    throw Error(
      "This demo manager can only manage riders for the selected merchant.",
    );
  return riderMemberships;
};
const projectRider = (
  rider: Rider,
  riderMemberships: RiderMembership[],
): Rider => {
  const active = riderMemberships.filter((item) => item.status === "active");
  const enabled = active.length > 0;
  return {
    ...rider,
    merchantIds: riderMemberships.map((item) => item.merchantId),
    branchIds: [...new Set(riderMemberships.flatMap((item) => item.branchIds))],
    enabled,
    status: enabled
      ? "active"
      : riderMemberships.some((item) => item.status === "suspended")
        ? "suspended"
        : "archived",
    availability: enabled ? rider.availability : "Offline",
  };
};
const validateBranches = (
  state: State,
  merchantId: string,
  branchIds: string[],
) => {
  if (
    !branchIds.length ||
    branchIds.some(
      (branchId) =>
        state.branches.find((branch) => branch.id === branchId)?.merchantId !==
        merchantId,
    )
  )
    throw Error("Choose branches belonging to this merchant.");
};
type RiderInput = Pick<Rider, "name" | "phone" | "email" | "vehicle">;
export const riderManagementService = {
  create(
    state: State,
    actor: DemoActor,
    merchantId: string,
    input: RiderInput,
    branchIds: string[],
  ) {
    assertScope(state, actor, merchantId);
    if (input.name.trim().length < 2)
      throw Error("Enter the rider's full name.");
    if (input.phone && !/^[6-9]\d{9}$/.test(input.phone.replace(/\s/g, "")))
      throw Error("Enter a valid 10-digit mobile number.");
    if (input.email && !/^\S+@\S+\.\S+$/.test(input.email))
      throw Error("Enter a valid email address.");
    validateBranches(state, merchantId, branchIds);
    if (
      state.riders.some(
        (item) =>
          item.phone &&
          input.phone &&
          item.phone === input.phone &&
          memberships(state).some(
            (membership) =>
              membership.riderId === item.id &&
              membership.merchantId === merchantId &&
              membership.status !== "archived",
          ),
      )
    )
      throw Error(
        "This rider already has an active membership for this merchant.",
      );
    const rider: Rider = {
      id: id("rider"),
      name: input.name.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      vehicle: input.vehicle?.trim(),
      merchantIds: [merchantId],
      branchIds,
      availability: "Available",
      enabled: true,
      status: "active",
    };
    const membership: RiderMembership = {
      id: id("membership"),
      riderId: rider.id,
      merchantId,
      branchIds,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    return {
      ...state,
      riders: [...state.riders, rider],
      riderMemberships: [...memberships(state), membership],
      ...audit(state, `${rider.name}: rider created`),
    };
  },
  updateProfile(
    state: State,
    actor: DemoActor,
    riderId: string,
    patch: RiderInput,
  ) {
    memberScope(state, actor, riderId);
    if (patch.name.trim().length < 2)
      throw Error("Enter the rider's full name.");
    if (patch.phone && !/^[6-9]\d{9}$/.test(patch.phone.replace(/\s/g, "")))
      throw Error("Enter a valid 10-digit mobile number.");
    if (patch.email && !/^\S+@\S+\.\S+$/.test(patch.email))
      throw Error("Enter a valid email address.");
    const rider = state.riders.find((item) => item.id === riderId)!;
    return {
      ...state,
      riders: state.riders.map((item) =>
        item.id === riderId
          ? {
              ...item,
              name: patch.name.trim(),
              phone: patch.phone?.trim(),
              email: patch.email?.trim(),
              vehicle: patch.vehicle?.trim(),
            }
          : item,
      ),
      ...audit(state, `${rider.name}: rider profile updated`),
    };
  },
  setBranches(
    state: State,
    actor: DemoActor,
    membershipId: string,
    branchIds: string[],
  ) {
    const membership = memberships(state).find(
      (item) => item.id === membershipId,
    );
    if (!membership) throw Error("Rider membership not found.");
    assertScope(state, actor, membership.merchantId);
    validateBranches(state, membership.merchantId, branchIds);
    const nextMemberships = memberships(state).map((item) =>
      item.id === membershipId
        ? { ...item, branchIds: [...new Set(branchIds)] }
        : item,
    );
    const rider = state.riders.find((item) => item.id === membership.riderId)!;
    return {
      ...state,
      riderMemberships: nextMemberships,
      riders: state.riders.map((item) =>
        item.id === rider.id
          ? projectRider(
              item,
              nextMemberships.filter((record) => record.riderId === item.id),
            )
          : item,
      ),
      ...audit(state, `${rider.name}: branch access updated`),
    };
  },
  addMembership(
    state: State,
    actor: DemoActor,
    riderId: string,
    merchantId: string,
    branchIds: string[],
  ) {
    assertScope(state, actor, merchantId);
    validateBranches(state, merchantId, branchIds);
    const rider = state.riders.find((item) => item.id === riderId);
    if (!rider) throw Error("Rider not found.");
    if (
      memberships(state).some(
        (item) =>
          item.riderId === riderId &&
          item.merchantId === merchantId &&
          item.status !== "archived",
      )
    )
      throw Error(
        "This rider already has an active membership for this merchant.",
      );
    const membership: RiderMembership = {
      id: id("membership"),
      riderId,
      merchantId,
      branchIds: [...new Set(branchIds)],
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const nextMemberships = [...memberships(state), membership];
    return {
      ...state,
      riderMemberships: nextMemberships,
      riders: state.riders.map((item) =>
        item.id === riderId
          ? projectRider(
              item,
              nextMemberships.filter((record) => record.riderId === riderId),
            )
          : item,
      ),
      ...audit(state, `${rider.name}: merchant membership added`),
    };
  },
  setMembershipStatus(
    state: State,
    actor: DemoActor,
    membershipId: string,
    status: RiderMembership["status"],
  ) {
    const membership = memberships(state).find(
      (item) => item.id === membershipId,
    );
    if (!membership) throw Error("Rider membership not found.");
    assertScope(state, actor, membership.merchantId);
    const active = state.orders.some(
      (order) =>
        order.riderId === membership.riderId &&
        order.merchantId === membership.merchantId &&
        !["Delivered", "Cancelled"].includes(order.status),
    );
    if (active && status !== "active")
      throw Error(
        "Reassign active deliveries before changing this membership.",
      );
    const nextMemberships = memberships(state).map((item) =>
      item.id === membershipId ? { ...item, status } : item,
    );
    const rider = state.riders.find((item) => item.id === membership.riderId)!;
    return {
      ...state,
      riderMemberships: nextMemberships,
      riders: state.riders.map((item) =>
        item.id === membership.riderId
          ? projectRider(
              item,
              nextMemberships.filter((record) => record.riderId === item.id),
            )
          : item,
      ),
      ...audit(state, `${rider.name}: membership ${status}`),
    };
  },
  setAvailability(
    state: State,
    riderId: string,
    availability: Rider["availability"],
  ) {
    const rider = state.riders.find((item) => item.id === riderId);
    if (!rider) throw Error("Rider not found.");
    if (!rider.enabled)
      throw Error("This rider has no active merchant membership.");
    if (rider.availability === "Busy" && availability !== "Busy")
      throw Error(
        "Finish or reassign the active delivery before changing availability.",
      );
    return {
      ...state,
      riders: state.riders.map((item) =>
        item.id === riderId ? { ...item, availability } : item,
      ),
      ...audit(state, `${rider.name}: availability set to ${availability}`),
    };
  },
  eligible(state: State, merchantId: string, branchId: string) {
    return state.riders.filter(
      (rider) =>
        rider.enabled &&
        rider.availability === "Available" &&
        memberships(state).some(
          (membership) =>
            membership.riderId === rider.id &&
            membership.merchantId === merchantId &&
            membership.status === "active" &&
            membership.branchIds.includes(branchId),
        ),
    );
  },
};
