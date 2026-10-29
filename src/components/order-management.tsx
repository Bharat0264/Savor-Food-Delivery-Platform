"use client";
import { useState } from "react";
import { useDemo } from "./provider";
import { Modal } from "./ui";
import { money } from "@/lib/brand";
import { Order, Product, Status } from "@/lib/model";
import { nextStatus } from "@/lib/repository";
export function OrderTable({
  orders,
  onDetail,
  act,
}: {
  orders: Order[];
  onDetail: (o: Order) => void;
  act: (id: string, status: Status) => void;
}) {
  const { state } = useDemo();
  return (
    <div className="ops-panel">
      <div className="panel-title">
        <h3>Orders at a glance</h3>
        <span>{orders.length} orders</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Merchant</th>
              <th>Items</th>
              <th>Value</th>
              <th>Status</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <button className="text-link" onClick={() => onDetail(o)}>
                    {o.id} ↗
                  </button>
                </td>
                <td>
                  {state.merchants.find((m) => m.id === o.merchantId)?.name}
                </td>
                <td>{o.items.reduce((n, i) => n + i.quantity, 0)} items</td>
                <td>{money(o.total)}</td>
                <td>
                  <span className="status">{o.status}</span>
                </td>
                <td>
                  {["Pending", "Accepted", "Preparing"].includes(o.status) ? (
                    <button
                      className="small-btn"
                      onClick={() => act(o.id, nextStatus[o.status]!)}
                    >
                      {o.status === "Pending"
                        ? "Accept order"
                        : o.status === "Accepted"
                          ? "Start preparing"
                          : "Mark ready"}
                    </button>
                  ) : (
                    <button className="text-link" onClick={() => onDetail(o)}>
                      View / assign →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && (
          <p className="empty-table">No orders in this view yet.</p>
        )}
      </div>
    </div>
  );
}
export function OrderDetail({
  order: o,
  act,
}: {
  order: Order;
  act: (id: string, status: Status, riderId?: string) => void;
}) {
  const { state } = useDemo();
  return (
    <>
      <span className="status">{o.status}</span>
      <p>{o.address}</p>
      <p>{o.instructions || "No delivery instructions"}</p>
      {o.items.map((i, j) => (
        <div key={j} className="summary-line">
          <span>
            {i.quantity} × {i.name}
            <small>{i.option}</small>
          </span>
          <b>{money(i.price * i.quantity)}</b>
        </div>
      ))}
      <div className="summary-line total">
        <b>Total</b>
        <b>{money(o.total)}</b>
      </div>
      <label className="field">
        Assign / reassign delivery partner
        <select
          value={o.riderId || ""}
          onChange={(e) => {
            if (e.target.value) act(o.id, o.status, e.target.value);
          }}
          disabled={["Delivered", "Cancelled"].includes(o.status)}
        >
          <option value="">Choose an associated rider</option>
          {state.riders
            .filter(
              (r) =>
                r.merchantIds.includes(o.merchantId) &&
                r.enabled &&
                r.availability !== "Offline",
            )
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.availability}
              </option>
            ))}
        </select>
      </label>
      {!["Delivered", "Cancelled"].includes(o.status) && (
        <button
          className="btn light full"
          onClick={() => act(o.id, "Cancelled")}
        >
          Cancel demo order
        </button>
      )}
      <p className="demo-notice">
        Pickup and OTP completion happen in the rider view. Payment: {o.payment}
        .
      </p>
    </>
  );
}
export function ProductEditor({
  canSelectMerchant = false,
  product: p,
  onClose,
}: {
  product: Product;
  canSelectMerchant?: boolean;
  onClose: () => void;
}) {
  const { setState, toast, state } = useDemo();
  const [draft, setDraft] = useState(p);
  return (
    <Modal
      title={p.name ? "Edit product" : "A new little favourite"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setState((s) => ({
            ...s,
            products: s.products.some((x) => x.id === draft.id)
              ? s.products.map((x) => (x.id === draft.id ? draft : x))
              : [...s.products, draft],
          }));
          toast("Catalog updated");
          onClose();
        }}
      >
        <label className="field">
          Name
          <input
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="field">
          Description
          <textarea
            required
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <label className="field">
          Merchant
          <select
            value={draft.merchantId}
            disabled={!canSelectMerchant}
            onChange={(e) => setDraft({ ...draft, merchantId: e.target.value })}
          >
            {state.merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <input
            required
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Price (₹)
            <input
              type="number"
              min="1"
              required
              value={draft.price}
              onChange={(e) =>
                setDraft({ ...draft, price: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Stock
            <input
              type="number"
              min="0"
              required
              value={draft.stock}
              onChange={(e) =>
                setDraft({ ...draft, stock: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button className="btn full">Save product</button>
      </form>
    </Modal>
  );
}
