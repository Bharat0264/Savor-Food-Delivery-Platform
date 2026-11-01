"use client";
import { useState } from "react";
import { useDemo } from "./provider";
import { Modal } from "./ui";
import { moneyPaise } from "@/lib/brand";
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
                <td>{moneyPaise(o.totalPaise)}</td>
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
  actor,
  onAssignment,
  onAssignmentCancel,
  onOrderCancel,
}: {
  order: Order;
  actor: "merchant" | "admin";
  onAssignment: (orderId: string, riderId: string, reason: string, reassign: boolean, custodyHandoverConfirmed: boolean) => void;
  onAssignmentCancel: (orderId: string, reason: string) => void;
  onOrderCancel: (orderId: string, reason: string) => void;
}) {
  const { state } = useDemo();
  const [riderId, setRiderId] = useState("");
  const [reason, setReason] = useState("");
  const [custodyConfirmed, setCustodyConfirmed] = useState(false);
  const assignment = state.assignments.find((item) => item.orderId === o.id && ["pending", "accepted"].includes(item.status));
  const candidates = state.riders.map((rider) => {
    const membership = state.riderMemberships.find((item) => item.riderId === rider.id && item.merchantId === o.merchantId && item.branchIds.includes(o.branchId));
    const busy = state.assignments.some((item) => item.riderId === rider.id && ["pending", "accepted"].includes(item.status) && item.orderId !== o.id);
    const eligible = Boolean(rider.enabled && rider.availability === "Available" && membership?.status === "active" && !busy);
    return { rider, membership, busy, eligible };
  });
  const history = state.assignments.filter((item) => item.orderId === o.id);
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
          <b>{moneyPaise(i.lineTotalPaise)}</b>
        </div>
      ))}
      <div className="summary-line total">
        <b>Total</b>
        <b>{moneyPaise(o.totalPaise)}</b>
      </div>
      <div className="editor-section">
        <h4>Delivery assignment</h4>
        {assignment ? <p className="demo-notice">{state.riders.find((rider) => rider.id === assignment.riderId)?.name} · {assignment.status === "pending" ? "awaiting rider acceptance" : "accepted"}</p> : <p className="demo-notice">No active rider assignment.</p>}
        {!["Delivered", "Cancelled"].includes(o.status) && <>
          <label className="field">{assignment ? "Replacement rider" : "Eligible delivery partner"}<select value={riderId} onChange={(event) => setRiderId(event.target.value)} disabled={o.status !== "Ready" && !assignment}><option value="">Choose a rider</option>{candidates.filter((candidate) => candidate.eligible && candidate.rider.id !== assignment?.riderId).map(({ rider }) => <option key={rider.id} value={rider.id}>{rider.name} · {rider.phone || "No mobile"}</option>)}</select></label>
          <div className="assignment-candidates">{candidates.map(({ rider, membership, busy, eligible }) => <small key={rider.id}>{rider.name} · {eligible ? "Eligible" : !membership ? "Not branch-authorized" : membership.status !== "active" ? "Membership unavailable" : busy || rider.availability !== "Available" ? `Unavailable · ${rider.availability}` : "Ineligible"}</small>)}</div>
          {assignment && <label className="field">{actor === "admin" ? "Override / reassignment reason" : "Reassignment reason"}<input required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the operational change" /></label>}
          {assignment && ["picked_up", "at_destination"].includes(o.deliveryState || "") && <label className="radio-row"><input type="checkbox" checked={custodyConfirmed} onChange={(event) => setCustodyConfirmed(event.target.checked)} disabled={actor !== "admin"} /> Admin-confirmed physical custody handover</label>}
          <div className="modal-actions"><button className="btn" disabled={!riderId || (o.status !== "Ready" && !assignment) || (["picked_up", "at_destination"].includes(o.deliveryState || "") && (actor !== "admin" || !custodyConfirmed))} onClick={() => onAssignment(o.id, riderId, reason, Boolean(assignment), custodyConfirmed)}>{assignment ? "Reassign rider" : "Request assignment"}</button>{assignment && <button className="btn light" disabled={!reason.trim()} onClick={() => onAssignmentCancel(o.id, reason)}>Cancel assignment</button>}</div>
        </>}
        {!!history.length && <div className="assignment-history"><h4>Assignment history</h4>{history.map((item) => <p key={item.id}><b>{state.riders.find((rider) => rider.id === item.riderId)?.name}</b> · {item.status} · {new Date(item.assignedAt).toLocaleString("en-IN")}{item.reassignmentReason ? ` · ${item.reassignmentReason}` : ""}</p>)}</div>}
      </div>
      {!["Delivered", "Cancelled"].includes(o.status) && (
        <button
          className="btn light full"
          onClick={() => onOrderCancel(o.id, reason || "Operational cancellation")}
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
