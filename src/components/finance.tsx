"use client";
import { useDemo } from "./provider";
import { money } from "@/lib/brand";
import { payments, settlements } from "@/lib/selectors";
import { Order } from "@/lib/model";
export function FinancePanel({
  tab,
  title,
  orders,
  onDetail,
  onExport,
}: {
  tab: string;
  title: string;
  orders: Order[];
  onDetail: (o: Order) => void;
  onExport: () => void;
}) {
  const { state, setState, toast } = useDemo();
  const ledger = settlements(state);
  const paymentRecords = payments(state);
  return (
    <div className="ops-panel">
      <h3>{title}</h3>
      <p className="demo-notice">
        Simulated financial ledger. Deduction rules are not configured. Gross
        order values are not payable balances. T+2 dates are illustrative
        calendar-day schedules, not bank settlements.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order / statement</th>
              <th>Merchant</th>
              <th>Gross value</th>
              <th>
                {tab === "payments" ? "Payment status" : "Settlement status"}
              </th>
              <th>Illustrative T+2 date</th>
              {tab === "refunds" && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const entry = ledger.find((e) => e.orderId === o.id)!;
              const payment = paymentRecords.find((p) => p.orderId === o.id)!;
              const refunded = state.refunds.some((r) => r.orderId === o.id);
              return (
                <tr key={o.id}>
                  <td>
                    <button className="text-link" onClick={() => onDetail(o)}>
                      {o.id} ↗
                    </button>
                  </td>
                  <td>
                    {state.merchants.find((m) => m.id === o.merchantId)?.name}
                  </td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span className="status">
                      {tab === "payments"
                        ? payment.status
                        : refunded
                          ? "Simulated refunded"
                          : entry.status}
                    </span>
                  </td>
                  <td>
                    {new Date(entry.scheduledAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>
                  {tab === "refunds" && (
                    <td>
                      <button
                        disabled={o.status === "Cancelled" || refunded}
                        className="text-link"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            refunds: [
                              ...s.refunds,
                              {
                                id: `REF-${o.id}`,
                                orderId: o.id,
                                amount: o.total,
                                status: "Simulated",
                                reason: "Admin demo intervention",
                              },
                            ],
                            audit: [
                              {
                                id: crypto.randomUUID(),
                                message: `${o.id}: Simulated full refund recorded`,
                              },
                              ...s.audit,
                            ],
                          }));
                          toast("Simulated refund recorded. No money moved.");
                        }}
                      >
                        {refunded ? "Refund recorded" : "Record demo refund"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn light" onClick={onExport}>
        Download demo statement
      </button>
    </div>
  );
}
