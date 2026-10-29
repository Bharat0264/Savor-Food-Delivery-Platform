import {
  State,
  Customer,
  MerchantManager,
  RiderMembership,
  PaymentRecord,
  SettlementRecord,
  Review,
} from "./model";
export const customers = (state: State): Customer[] => [
  state.customer,
  {
    id: "c2",
    name: "Vikram Shah",
    email: "vikram@example.test",
    phone: "98765 12340",
  },
  {
    id: "c3",
    name: "Ishita Menon",
    email: "ishita@example.test",
    phone: "98765 45670",
  },
];
export const managers = (state: State): MerchantManager[] =>
  state.merchantManagers;
export const memberships = (state: State): RiderMembership[] =>
  state.riders.flatMap((r) =>
    r.merchantIds.map((merchantId) => ({ merchantId, riderId: r.id })),
  );
export const payments = (state: State): PaymentRecord[] =>
  state.orders.map((o) => ({
    id: `PAY-${o.id}`,
    orderId: o.id,
    merchantId: o.merchantId,
    amountPaise: o.totalPaise,
    method: o.payment,
    status: state.refunds.some((r) => r.orderId === o.id)
      ? "Simulated refunded"
      : o.status === "Cancelled"
        ? "Simulated voided"
        : "Simulated paid",
  }));
export const settlements = (state: State): SettlementRecord[] =>
  state.orders.map((o) => ({
    id: `SET-${o.id}`,
    orderId: o.id,
    merchantId: o.merchantId,
    grossPaise: o.totalPaise,
    deductions: null,
    net: null,
    scheduledAt: new Date(
      new Date(o.createdAt).getTime() + 2 * 86400000,
    ).toISOString(),
    status:
      state.refunds.some((r) => r.orderId === o.id) || o.status === "Cancelled"
        ? "Excluded"
        : o.status === "Delivered"
          ? "Illustrative T+2 eligible"
          : "Awaiting delivery",
  }));
export const reviews = (state: State): Review[] =>
  state.orders
    .filter((o) => o.rating !== undefined)
    .map((o) => ({
      orderId: o.id,
      merchantId: o.merchantId,
      customerId: o.customerId,
      rating: o.rating!,
      feedback: o.feedback || "",
    }));
