"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDemo } from "./provider";
import { Modal } from "./ui";
export function RiderManagement({
  admin,
  merchantId,
}: {
  admin: boolean;
  merchantId: string;
}) {
  const { state, setState, toast } = useDemo();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(merchantId);
  const riders = state.riders.filter(
    (r) => admin || r.merchantIds.includes(merchantId),
  );
  return (
    <div className="ops-panel">
      <div className="panel-title">
        <h3>Delivery partners</h3>
        <button className="btn" onClick={() => setAdding(true)}>
          <Plus size={16} />
          Add partner
        </button>
      </div>
      {riders.map((r) => (
        <div className="rider-row" key={r.id}>
          <span className="avatar">
            {r.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <div>
            <b>{r.name}</b>
            <small>
              {r.merchantIds
                .map((id) => state.merchants.find((m) => m.id === id)?.name)
                .join(" · ") || "No active merchant memberships"}
            </small>
          </div>
          <span className="status">
            {r.enabled ? r.availability : "Disabled"}
          </span>
          <button
            className="text-link"
            onClick={() =>
              setState((s) => ({
                ...s,
                riders: s.riders.map((x) =>
                  x.id === r.id ? { ...x, enabled: !x.enabled } : x,
                ),
              }))
            }
          >
            {r.enabled ? "Disable" : "Enable"}
          </button>
          <button
            className="text-link"
            disabled={!r.merchantIds.length}
            onClick={() => {
              if (
                state.orders.some(
                  (o) =>
                    o.riderId === r.id &&
                    !["Delivered", "Cancelled"].includes(o.status),
                )
              ) {
                toast(
                  "Reassign active deliveries before removing this partner.",
                );
                return;
              }
              setState((s) => ({
                ...s,
                riders: s.riders.map((x) =>
                  x.id === r.id
                    ? {
                        ...x,
                        merchantIds: admin
                          ? []
                          : x.merchantIds.filter((m) => m !== merchantId),
                      }
                    : x,
                ),
              }));
              toast("Demo membership removed");
            }}
          >
            {admin ? "Remove memberships" : "Remove membership"}
          </button>
        </div>
      ))}
      {!riders.length && (
        <p>Add a delivery partner to assign your ready orders.</p>
      )}
      {adding && (
        <Modal title="A new delivery partner" onClose={() => setAdding(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setState((s) => ({
                ...s,
                riders: [
                  ...s.riders,
                  {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    merchantIds: [admin ? selected : merchantId],
                    availability: "Available",
                    enabled: true,
                  },
                ],
              }));
              setName("");
              setAdding(false);
              toast("Delivery partner added");
            }}
          >
            <label className="field">
              Partner name
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {admin && (
              <label className="field">
                Associated merchant
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {state.merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="demo-notice">
              Development-only registration. No invitation is sent.
            </p>
            <button className="btn full">Add delivery partner</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
