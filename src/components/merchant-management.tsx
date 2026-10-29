"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Edit3, Plus, Store } from "lucide-react";
import { useDemo } from "./provider";
import { Modal } from "./ui";
import { Branch, Merchant } from "@/lib/model";
import { merchantManagement, type DemoActor } from "@/lib/services";

function useMutation() {
  const { toast } = useDemo();
  return (operation: () => void) => {
    try {
      operation();
    } catch (error) {
      toast((error as Error).message);
    }
  };
}

export function BranchManagement({ merchantId, admin }: { merchantId: string; admin: boolean }) {
  const { state, setState, toast } = useDemo();
  const mutate = useMutation();
  const actor: DemoActor = admin ? "admin" : "merchant";
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [managerName, setManagerName] = useState("");
  const [addingManager, setAddingManager] = useState(false);
  const branches = state.branches.filter((branch) => branch.merchantId === merchantId);
  const managers = state.merchantManagers.filter((manager) => manager.merchantId === merchantId);

  const saveBranch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "Bengaluru").trim(),
      acceptingOrders: form.get("acceptingOrders") === "on",
      deliveryAvailable: form.get("deliveryAvailable") === "on",
    };
    mutate(() => {
      setState((current) =>
        editing
          ? merchantManagement.updateBranch(current, actor, editing.id, input)
          : merchantManagement.addBranch(current, actor, merchantId, input),
      );
      setEditing(null);
      setAdding(false);
      toast(editing ? "Branch updated" : "Branch created");
    });
  };

  return (
    <div className="ops-panel">
      <div className="panel-title">
        <div>
          <h3>Branches & delivery availability</h3>
          <p>Switch the active branch, assign managers, and set trading hours.</p>
        </div>
        <button className="btn" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add branch
        </button>
      </div>
      {branches.map((branch) => (
        <div className="rider-row" key={branch.id}>
          <Store />
          <div>
            <b>{branch.name}</b>
            <small>
              {branch.address} · {branch.hours.filter((day) => !day.closed).length}/7 days open
            </small>
          </div>
          <span className="status">
            {branch.acceptingOrders && branch.deliveryAvailable ? "Taking orders" : "Paused"}
          </span>
          <button
            className="text-link"
            onClick={() =>
              mutate(() => setState((current) => merchantManagement.selectBranch(current, branch.id)))
            }
          >
            {state.selection.branchId === branch.id ? "Current branch" : "Switch here"}
          </button>
          <button className="text-link" onClick={() => setEditing(branch)}>
            <Edit3 size={14} /> Edit
          </button>
        </div>
      ))}
      <div className="manager-list">
        <div className="panel-title">
          <h3>Merchant managers</h3>
          <button className="text-link" onClick={() => setAddingManager(true)}>
            <Plus size={14} /> Add manager
          </button>
        </div>
        {managers.map((manager) => (
          <div className="manager-card" key={manager.id}>
            <label className="radio-row">
              <input
                type="checkbox"
                checked={manager.active}
                onChange={() =>
                  mutate(() =>
                    setState((current) =>
                      merchantManagement.setManagerActive(current, actor, manager.id, !manager.active),
                    ),
                  )
                }
              />
              <div>
                <b>{manager.name}</b>
                <small>{manager.active ? "Active manager" : "Access disabled"}</small>
              </div>
            </label>
            <div className="branch-access-list" aria-label={`${manager.name} branch access`}>
              {branches.map((branch) => (
                <label key={branch.id}>
                  <input
                    type="checkbox"
                    checked={manager.branchIds.includes(branch.id)}
                    onChange={(event) => {
                      const branchIds = event.target.checked
                        ? [...manager.branchIds, branch.id]
                        : manager.branchIds.filter((id) => id !== branch.id);
                      mutate(() =>
                        setState((current) =>
                          merchantManagement.assignManager(current, actor, manager.id, branchIds),
                        ),
                      );
                    }}
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(adding || editing) && (
        <Modal title={editing ? "Edit branch" : "Open a branch"} onClose={() => { setAdding(false); setEditing(null); }}>
          <form className="form-grid" onSubmit={saveBranch}>
            <label className="field">Branch name<input name="name" required defaultValue={editing?.name} /></label>
            <label className="field">Address<input name="address" required defaultValue={editing?.address} /></label>
            <label className="field">City<input name="city" required defaultValue={editing?.city || "Bengaluru"} /></label>
            <label className="radio-row"><input name="acceptingOrders" type="checkbox" defaultChecked={editing?.acceptingOrders ?? true} />Accepting orders</label>
            <label className="radio-row"><input name="deliveryAvailable" type="checkbox" defaultChecked={editing?.deliveryAvailable ?? true} />Delivery available</label>
            {editing && <HoursEditor branch={editing} actor={actor} />}
            <button className="btn full">{editing ? "Save branch" : "Create branch"}</button>
          </form>
        </Modal>
      )}
      {addingManager && (
        <Modal title="Add merchant manager" onClose={() => setAddingManager(false)}>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              mutate(() => {
                setState((current) =>
                  merchantManagement.addManager(
                    current,
                    actor,
                    merchantId,
                    managerName,
                    [branches[0]?.id].filter(Boolean),
                  ),
                );
                setManagerName("");
                setAddingManager(false);
                toast("Manager added to the selected branch");
              });
            }}
          >
            <label className="field">Manager name<input value={managerName} required onChange={(event) => setManagerName(event.target.value)} /></label>
            <p className="demo-notice">The manager starts with access to the first branch. Use the branch access controls to assign more branches.</p>
            <button className="btn full">Add manager</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function HoursEditor({ branch, actor }: { branch: Branch; actor: DemoActor }) {
  const { setState, toast } = useDemo();
  const [hours, setHours] = useState(branch.hours);
  return (
    <div className="hours-editor">
      <b>Business hours</b>
      {hours.map((day, index) => (
        <div className="hours-row" key={day.weekday}>
          <span>{day.weekday}</span>
          <input type="time" value={day.open} disabled={day.closed} onChange={(event) => setHours((current) => current.map((item, position) => position === index ? { ...item, open: event.target.value } : item))} />
          <input type="time" value={day.close} disabled={day.closed} onChange={(event) => setHours((current) => current.map((item, position) => position === index ? { ...item, close: event.target.value } : item))} />
          <label><input type="checkbox" checked={day.closed} onChange={(event) => setHours((current) => current.map((item, position) => position === index ? { ...item, closed: event.target.checked } : item))} />Closed</label>
        </div>
      ))}
      <button type="button" className="text-link" onClick={() => {
        try {
          setState((current) => merchantManagement.setBranchHours(current, actor, branch.id, hours));
          toast("Business hours saved");
        } catch (error) { toast((error as Error).message); }
      }}><Check size={14} />Save hours</button>
    </div>
  );
}

export function MerchantDirectory({ kind, approvals }: { kind?: Merchant["kind"]; approvals?: boolean }) {
  const { state, setState, toast } = useDemo();
  const mutate = useMutation();
  const [registering, setRegistering] = useState(false);
  const merchants = useMemo(
    () => state.merchants.filter((merchant) => (approvals ? merchant.lifecycle === "pending" : !kind || merchant.kind === kind)),
    [approvals, kind, state.merchants],
  );
  return (
    <div className="ops-panel">
      <div className="panel-title"><h3>{approvals ? "Merchant approvals" : "Marketplace businesses"}</h3><button className="btn" onClick={() => setRegistering(true)}><Plus size={16} />Register merchant</button></div>
      {merchants.map((merchant) => (
        <div className="rider-row" key={merchant.id}>
          <img className="avatar" src={merchant.image} alt="" />
          <div><b>{merchant.name}</b><small>{merchant.address} · {merchant.kind === "food" ? "Restaurant" : "Grocery"}</small></div>
          <span className="status">{merchant.lifecycle}</span>
          {merchant.lifecycle === "pending" ? <button className="btn light" onClick={() => mutate(() => { setState((current) => merchantManagement.review(current, merchant.id, "approve")); toast("Merchant approved"); })}>Approve</button> : merchant.lifecycle === "suspended" || merchant.lifecycle === "rejected" ? <button className="btn light" onClick={() => mutate(() => { setState((current) => merchantManagement.review(current, merchant.id, "reactivate")); toast("Merchant reactivated"); })}>Reactivate</button> : <button className="text-link" onClick={() => mutate(() => { setState((current) => merchantManagement.review(current, merchant.id, "suspend")); toast("Merchant suspended"); })}>Suspend</button>}
        </div>
      ))}
      {!merchants.length && <p>Nothing needs review right now.</p>}
      {registering && <MerchantRegistrationForm onClose={() => setRegistering(false)} />}
    </div>
  );
}

function MerchantRegistrationForm({ onClose }: { onClose: () => void }) {
  const { setState, toast } = useDemo();
  const mutate = useMutation();
  return <Modal title="Register a merchant" onClose={onClose}><form className="form-grid" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutate(() => { setState((current) => merchantManagement.register(current, { name: String(form.get("name")), kind: String(form.get("kind")) as Merchant["kind"], category: String(form.get("category")), description: String(form.get("description")), address: String(form.get("address")), image: String(form.get("kind")) === "food" ? "/images/food.jpg" : "/images/grocery.jpg" })); toast("Merchant application created for approval"); onClose(); });
  }}><label className="field">Business name<input name="name" required /></label><label className="field">Type<select name="kind"><option value="food">Restaurant</option><option value="grocery">Grocery store</option></select></label><label className="field">Category<input name="category" required placeholder="Indian · Comfort food" /></label><label className="field">Address<input name="address" required /></label><label className="field">Description<textarea name="description" required /></label><p className="demo-notice">This creates a pending local merchant record. No real onboarding or invitation occurs.</p><button className="btn full">Submit for approval</button></form></Modal>;
}

export function MerchantProfileEditor({ merchantId, admin }: { merchantId: string; admin: boolean }) {
  const { state, setState, toast } = useDemo();
  const merchant = state.merchants.find((item) => item.id === merchantId);
  if (!merchant) return null;
  return <div className="ops-panel"><h3>Business profile</h3><form className="form-grid" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { setState((current) => merchantManagement.updateProfile(current, admin ? "admin" : "merchant", merchantId, { name: String(form.get("name")), category: String(form.get("category")), description: String(form.get("description")), address: String(form.get("address")) })); toast("Business profile saved"); } catch (error) { toast((error as Error).message); }
  }}><label className="field">Business name<input name="name" defaultValue={merchant.name} required /></label><label className="field">Category<input name="category" defaultValue={merchant.category} required /></label><label className="field">Address<input name="address" defaultValue={merchant.address} required /></label><label className="field">Description<textarea name="description" defaultValue={merchant.description} required /></label><button className="btn">Save business profile</button></form></div>;
}
