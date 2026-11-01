"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import { Rider, RiderMembership } from "@/lib/model";
import { riderManagementService } from "@/lib/services";
import { useDemo } from "./provider";
import { Modal } from "./ui";

type RiderRecord = { rider: Rider; membership: RiderMembership };
type FormState = {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  merchantId: string;
  branchIds: string[];
  status: RiderMembership["status"];
};
const emptyForm = (merchantId: string, branchId: string): FormState => ({
  name: "",
  phone: "",
  email: "",
  vehicle: "",
  merchantId,
  branchIds: branchId ? [branchId] : [],
  status: "active",
});

export function RiderManagement({
  admin,
  merchantId,
}: {
  admin: boolean;
  merchantId: string;
}) {
  const { state, setState, toast } = useDemo();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | RiderMembership["status"]
  >("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RiderRecord | null>(null);
  const [detail, setDetail] = useState<RiderRecord | null>(null);
  const [attaching, setAttaching] = useState<RiderRecord | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(merchantId, state.selection.branchId),
  );
  const memberships = state.riderMemberships;
  const records = useMemo(
    () =>
      memberships
        .flatMap((membership) => {
          const rider = state.riders.find(
            (item) => item.id === membership.riderId,
          );
          return rider && (admin || membership.merchantId === merchantId)
            ? [{ rider, membership }]
            : [];
        })
        .filter(({ rider, membership }) => {
          const haystack =
            `${rider.name} ${rider.phone || ""} ${rider.email || ""}`.toLowerCase();
          return (
            haystack.includes(query.toLowerCase()) &&
            (statusFilter === "all" || membership.status === statusFilter) &&
            (branchFilter === "all" ||
              membership.branchIds.includes(branchFilter))
          );
        }),
    [
      admin,
      branchFilter,
      memberships,
      merchantId,
      query,
      state.riders,
      statusFilter,
    ],
  );
  const allBranches = state.branches.filter(
    (branch) => admin || branch.merchantId === merchantId,
  );
  const activeDeliveries = (riderId: string, scopedMerchantId?: string) =>
    state.orders.filter(
      (order) =>
        order.riderId === riderId &&
        (!scopedMerchantId || order.merchantId === scopedMerchantId) &&
        !["Delivered", "Cancelled"].includes(order.status),
    );
  const completedDeliveries = (riderId: string, scopedMerchantId?: string) =>
    state.orders.filter(
      (order) =>
        order.riderId === riderId &&
        order.status === "Delivered" &&
        (!scopedMerchantId || order.merchantId === scopedMerchantId),
    );
  const run = (action: () => void, success: string) => {
    try {
      action();
      toast(success);
    } catch (error) {
      toast((error as Error).message);
    }
  };
  const setMerchant = (nextMerchantId: string) =>
    setForm((current) => ({
      ...current,
      merchantId: nextMerchantId,
      branchIds: state.branches
        .filter(
          (branch) =>
            branch.merchantId === nextMerchantId &&
            branch.id === state.selection.branchId,
        )
        .map((branch) => branch.id),
    }));
  const toggleBranch = (branchId: string) =>
    setForm((current) => ({
      ...current,
      branchIds: current.branchIds.includes(branchId)
        ? current.branchIds.filter((id) => id !== branchId)
        : [...current.branchIds, branchId],
    }));
  const openCreate = () => {
    setForm(emptyForm(merchantId, state.selection.branchId));
    setAdding(true);
  };
  const openEdit = (record: RiderRecord) => {
    setForm({
      name: record.rider.name,
      phone: record.rider.phone || "",
      email: record.rider.email || "",
      vehicle: record.rider.vehicle || "",
      merchantId: record.membership.merchantId,
      branchIds: record.membership.branchIds,
      status: record.membership.status,
    });
    setEditing(record);
  };
  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    run(() => {
      let next = riderManagementService.create(
        state,
        admin ? "admin" : "merchant",
        admin ? form.merchantId : merchantId,
        form,
        form.branchIds,
      );
      if (form.status !== "active") {
        const created = next.riders.at(-1)!;
        const membership = next.riderMemberships.find(
          (item) => item.riderId === created.id,
        )!;
        next = riderManagementService.setMembershipStatus(
          next,
          admin ? "admin" : "merchant",
          membership.id,
          form.status,
        );
      }
      setState(() => next);
      setAdding(false);
    }, "Delivery partner added");
  };
  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    run(() => {
      let next = riderManagementService.updateProfile(
        state,
        admin ? "admin" : "merchant",
        editing.rider.id,
        form,
      );
      next = riderManagementService.setBranches(
        next,
        admin ? "admin" : "merchant",
        editing.membership.id,
        form.branchIds,
      );
      if (editing.membership.status !== form.status)
        next = riderManagementService.setMembershipStatus(
          next,
          admin ? "admin" : "merchant",
          editing.membership.id,
          form.status,
        );
      setState(() => next);
      setEditing(null);
    }, "Rider profile saved");
  };
  const submitMembership = (event: FormEvent) => {
    event.preventDefault();
    if (!attaching) return;
    run(() => {
      const next = riderManagementService.addMembership(
        state,
        "admin",
        attaching.rider.id,
        form.merchantId,
        form.branchIds,
      );
      setState(() => next);
      setAttaching(null);
    }, "Merchant membership added");
  };
  const openMembership = (record: RiderRecord) => {
    const merchant = state.merchants.find(
      (item) =>
        !memberships.some(
          (membership) =>
            membership.riderId === record.rider.id &&
            membership.merchantId === item.id &&
            membership.status !== "archived",
        ),
    );
    if (!merchant) {
      toast(
        "This rider already has an active membership with every demo merchant.",
      );
      return;
    }
    setForm({
      name: record.rider.name,
      phone: record.rider.phone || "",
      email: record.rider.email || "",
      vehicle: record.rider.vehicle || "",
      merchantId: merchant.id,
      branchIds: state.branches
        .filter((branch) => branch.merchantId === merchant.id)
        .slice(0, 1)
        .map((branch) => branch.id),
      status: "active",
    });
    setAttaching(record);
  };
  const membershipBranches = state.branches.filter(
    (branch) => branch.merchantId === form.merchantId,
  );
  const managementForm = (
    submit: (event: FormEvent) => void,
    isEdit = false,
  ) => (
    <form onSubmit={submit}>
      <label className="field">
        Full name
        <input
          required
          minLength={2}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Mobile number
          <input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
        </label>
        <label className="field">
          Email{" "}
          <input
            type="email"
            placeholder="Optional"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>
      </div>
      <label className="field">
        Vehicle details{" "}
        <input
          placeholder="Optional · e.g. KA 01 AB 1234"
          value={form.vehicle}
          onChange={(event) =>
            setForm({ ...form, vehicle: event.target.value })
          }
        />
      </label>
      {admin && !isEdit && (
        <label className="field">
          Associated merchant
          <select
            value={form.merchantId}
            onChange={(event) => setMerchant(event.target.value)}
          >
            {state.merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset className="field">
        <legend>Authorized branches</legend>
        <div className="chips">
          {membershipBranches.map((branch) => (
            <label className="chip" key={branch.id}>
              <input
                type="checkbox"
                checked={form.branchIds.includes(branch.id)}
                onChange={() => toggleBranch(branch.id)}
              />{" "}
              {branch.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        Membership status
        <select
          value={form.status}
          onChange={(event) =>
            setForm({
              ...form,
              status: event.target.value as RiderMembership["status"],
            })
          }
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          {isEdit && <option value="archived">Archived</option>}
        </select>
      </label>
      <p className="demo-notice">
        Development-only rider membership. No identity verification or
        invitation is sent.
      </p>
      <div className="modal-actions">
        <button className="btn" type="submit">
          <Check size={16} /> {isEdit ? "Save changes" : "Add delivery partner"}
        </button>
        <button
          className="btn light"
          type="button"
          onClick={() => (isEdit ? setEditing(null) : setAdding(false))}
        >
          Cancel
        </button>
      </div>
    </form>
  );
  return (
    <div className="ops-panel rider-directory">
      <div className="panel-title">
        <div>
          <h3>Delivery partners</h3>
          <span>
            {admin
              ? "Platform-wide membership directory"
              : "Branch-aware rider pool"}
          </span>
        </div>
        <button className="btn" onClick={openCreate}>
          <Plus size={16} /> Add partner
        </button>
      </div>
      <div className="ops-filters">
        <div className="searchbox">
          <Search size={17} />
          <input
            aria-label="Search delivery partners"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search partner, mobile or email…"
          />
        </div>
        <select
          aria-label="Rider membership status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as typeof statusFilter)
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <select
          aria-label="Authorized branch"
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value)}
        >
          <option value="all">All branches</option>
          {allBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rider-directory-list">
        {records.map(({ rider, membership }) => {
          const merchant = state.merchants.find(
            (item) => item.id === membership.merchantId,
          );
          const active = activeDeliveries(rider.id, membership.merchantId);
          const completed = completedDeliveries(
            rider.id,
            membership.merchantId,
          );
          const activeWarning = active.length > 0;
          return (
            <article className="rider-row" key={membership.id}>
              <span className="avatar">
                {rider.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <b>{rider.name}</b>
                <small>
                  {rider.phone || "No mobile"}
                  {rider.email ? ` · ${rider.email}` : ""}
                </small>
                <small>
                  {admin ? `${merchant?.name} · ` : ""}
                  {membership.branchIds
                    .map(
                      (id) =>
                        state.branches.find((branch) => branch.id === id)?.name,
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
              <div className="rider-stats">
                <span
                  className={`status ${membership.status === "active" ? "" : "muted"}`}
                >
                  {membership.status}
                </span>
                <small>
                  {rider.enabled ? rider.availability : "Unavailable"}
                </small>
                <small>
                  {active.length} active · {completed.length} completed
                </small>
              </div>
              <div className="row-actions">
                <button
                  className="text-link"
                  onClick={() => setDetail({ rider, membership })}
                >
                  View
                </button>
                <button
                  className="text-link"
                  onClick={() => openEdit({ rider, membership })}
                >
                  <Edit3 size={14} /> Edit
                </button>
                {membership.status === "active" ? (
                  <button
                    className="text-link"
                    disabled={activeWarning}
                    title={
                      activeWarning
                        ? "Reassign active deliveries first"
                        : undefined
                    }
                    onClick={() =>
                      run(
                        () =>
                          setState(() =>
                            riderManagementService.setMembershipStatus(
                              state,
                              admin ? "admin" : "merchant",
                              membership.id,
                              "suspended",
                            ),
                          ),
                        "Membership suspended",
                      )
                    }
                  >
                    Suspend
                  </button>
                ) : membership.status === "suspended" ? (
                  <button
                    className="text-link"
                    onClick={() =>
                      run(
                        () =>
                          setState(() =>
                            riderManagementService.setMembershipStatus(
                              state,
                              admin ? "admin" : "merchant",
                              membership.id,
                              "active",
                            ),
                          ),
                        "Membership reactivated",
                      )
                    }
                  >
                    Reactivate
                  </button>
                ) : null}
                <button
                  className="text-link danger"
                  disabled={membership.status === "archived" || activeWarning}
                  title={
                    activeWarning
                      ? "Reassign active deliveries first"
                      : undefined
                  }
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Archive ${rider.name}'s membership with ${merchant?.name}? Historical deliveries stay available.`,
                      )
                    )
                      return;
                    run(
                      () =>
                        setState(() =>
                          riderManagementService.setMembershipStatus(
                            state,
                            admin ? "admin" : "merchant",
                            membership.id,
                            "archived",
                          ),
                        ),
                      "Membership archived",
                    );
                  }}
                >
                  <Trash2 size={14} /> Archive
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!records.length && (
        <div className="empty">
          <span className="empty-symbol">
            <UserRound />
          </span>
          <h2>No delivery partners found</h2>
          <p>
            Try a different filter, or add a branch-authorized rider to this
            merchant.
          </p>
          <button className="btn" onClick={openCreate}>
            Add delivery partner
          </button>
        </div>
      )}
      {adding && (
        <Modal title="Add a delivery partner" onClose={() => setAdding(false)}>
          {managementForm(submitCreate)}
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Edit ${editing.rider.name}`}
          onClose={() => setEditing(null)}
        >
          {managementForm(submitEdit, true)}
        </Modal>
      )}
      {attaching && (
        <Modal
          title={`Add ${attaching.rider.name} to a merchant`}
          onClose={() => setAttaching(null)}
        >
          <form onSubmit={submitMembership}>
            <label className="field">
              Associated merchant
              <select
                value={form.merchantId}
                onChange={(event) => setMerchant(event.target.value)}
              >
                {state.merchants
                  .filter(
                    (merchant) =>
                      !memberships.some(
                        (membership) =>
                          membership.riderId === attaching.rider.id &&
                          membership.merchantId === merchant.id &&
                          membership.status !== "archived",
                      ),
                  )
                  .map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="field">
              <legend>Authorized branches</legend>
              <div className="chips">
                {membershipBranches.map((branch) => (
                  <label className="chip" key={branch.id}>
                    <input
                      type="checkbox"
                      checked={form.branchIds.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                    />{" "}
                    {branch.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="demo-notice">
              This grants an explicit, branch-scoped local demo membership.
            </p>
            <div className="modal-actions">
              <button className="btn" type="submit">
                Add membership
              </button>
              <button
                className="btn light"
                type="button"
                onClick={() => setAttaching(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.rider.name} onClose={() => setDetail(null)}>
          <div className="rider-detail">
            <p>
              <b>
                {
                  state.merchants.find(
                    (item) => item.id === detail.membership.merchantId,
                  )?.name
                }
              </b>{" "}
              · {detail.membership.status}
            </p>
            <p>
              {detail.rider.phone || "No phone"}
              {detail.rider.email ? ` · ${detail.rider.email}` : ""}
            </p>
            <p>Vehicle: {detail.rider.vehicle || "Not recorded"}</p>
            <h3>Authorized branches</h3>
            <p>
              {detail.membership.branchIds
                .map(
                  (id) =>
                    state.branches.find((branch) => branch.id === id)?.name,
                )
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h3>Membership history</h3>
            <p>
              {memberships
                .filter((membership) => membership.riderId === detail.rider.id)
                .map(
                  (membership) =>
                    `${state.merchants.find((merchant) => merchant.id === membership.merchantId)?.name || membership.merchantId} (${membership.status})`,
                )
                .join(" · ")}
            </p>
            <h3>Operational summary</h3>
            <p>
              {
                activeDeliveries(detail.rider.id, detail.membership.merchantId)
                  .length
              }{" "}
              active deliveries ·{" "}
              {
                completedDeliveries(
                  detail.rider.id,
                  detail.membership.merchantId,
                ).length
              }{" "}
              completed deliveries
            </p>
            {activeDeliveries(detail.rider.id, detail.membership.merchantId)
              .length > 0 && (
              <p className="demo-notice">
                <ShieldAlert size={15} /> Archive is blocked while this rider
                has active work. Reassign the delivery first.
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => {
                  setDetail(null);
                  openEdit(detail);
                }}
              >
                Edit rider
              </button>
              {admin && (
                <button
                  className="btn light"
                  onClick={() => {
                    setDetail(null);
                    openMembership(detail);
                  }}
                >
                  Add merchant membership
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
