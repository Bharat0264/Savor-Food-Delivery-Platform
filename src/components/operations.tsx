"use client";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Bike,
  Wallet,
  Settings,
  ArrowUpRight,
  Search,
  Activity,
  Users,
  Store,
  BarChart3,
  Bell,
  Shield,
  Tag,
  LifeBuoy,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { useDemo } from "./provider";
import { Modal } from "./ui";
import { FinancePanel } from "./finance";
import { RiderManagement } from "./rider-management";
import { OrderTable, OrderDetail } from "./order-management";
import { CatalogManagement } from "./catalog-management";
import {
  BranchManagement,
  MerchantDirectory,
  MerchantProfileEditor,
} from "./merchant-management";
import { money, brand } from "@/lib/brand";
import { updateOrder } from "@/lib/repository";
import { customers, managers, settlements } from "@/lib/selectors";
import { Order, Status } from "@/lib/model";
const merchantNav = [
  ["Overview", "", LayoutDashboard],
  ["Orders", "orders", Package],
  ["Products", "products", ShoppingBasket],
  ["Delivery partners", "riders", Bike],
  ["Branches", "branches", Store],
  ["Earnings", "earnings", Wallet],
  ["Settlements", "settlements", FileText],
  ["Business settings", "settings", Settings],
] as const;
const adminNav = [
  ["Overview", "", LayoutDashboard],
  ["Analytics", "analytics", BarChart3],
  ["All orders", "orders", Package],
  ["Restaurants", "restaurants", Store],
  ["Grocery stores", "stores", ShoppingBasket],
  ["Approvals", "approvals", Shield],
  ["Branches", "branches", Store],
  ["Customers", "customers", Users],
  ["Delivery partners", "riders", Bike],
  ["Products & prices", "products", Tag],
  ["Payments", "payments", Wallet],
  ["Balances", "balances", Wallet],
  ["Settlements · T+2", "settlements", FileText],
  ["Deduction rules", "deductions", Settings],
  ["Refunds", "refunds", RefreshCw],
  ["Promotions", "promotions", Tag],
  ["Notifications", "notifications", Bell],
  ["Support cases", "support", LifeBuoy],
  ["Audit activity", "audit", Activity],
  ["Platform settings", "settings", Settings],
] as const;
export function Operations({
  role,
  tab = "",
}: {
  role: "merchant" | "admin";
  tab?: string;
}) {
  const { state, setState, toast } = useDemo();
  const merchantId = state.selection.merchantId;
  const branchId = state.selection.branchId;
  const setMerchantId = (merchantId: string) =>
    setState((s) => ({
      ...s,
      selection: {
        ...s.selection,
        merchantId,
        branchId:
          s.branches.find((branch) => branch.merchantId === merchantId)?.id ?? "",
      },
    }));
  const setBranchId = (branchId: string) =>
    setState((s) => {
      const branch = s.branches.find((item) => item.id === branchId);
      return branch
        ? {
            ...s,
            selection: {
              ...s.selection,
              merchantId: branch.merchantId,
              branchId,
            },
          }
        : s;
    });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [detail, setDetail] = useState<Order | null>(null);
  const admin = role === "admin";
  const merchants = admin
    ? state.merchants
    : state.merchants.filter((m) => m.id === merchantId);
  const orders = state.orders.filter(
    (o) => admin || o.merchantId === merchantId,
  );
  const riders = state.riders.filter(
    (r) => admin || r.merchantIds.includes(merchantId),
  );
  const nav = admin ? adminNav : merchantNav;
  const title = nav.find((n) => n[1] === tab)?.[0] || "Overview";
  const gross = orders
    .filter((o) => o.status === "Delivered")
    .reduce((n, o) => n + o.total, 0);
  const act = (id: string, status: Status, riderId?: string) => {
    try {
      const updated = updateOrder(state, id, status, riderId);
      setState(() => updated);
      toast("Demo order updated");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const exportStatement = () => {
    const ledger = settlements(state).filter(
      (r) => admin || r.merchantId === merchantId,
    );
    const csv =
      "Statement,Order,Merchant,Gross,Deductions,Net,Status,Schedule\n" +
      ledger
        .map(
          (r) =>
            `${r.id},${r.orderId},${r.merchantId},${r.gross},Not configured,Not calculated,${r.status},${r.scheduledAt}`,
        )
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "savor-demo-statement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="ops">
      <aside className="ops-sidebar">
        <Link className="logo" href="/">
          {brand.name}
          <i>{brand.mark}</i>
        </Link>
        <div className="workspace-label">
          {admin ? "PLATFORM CONTROL" : "MERCHANT WORKSPACE"}
        </div>
        <div className="workspace-selectors">
          <select
            aria-label="Selected merchant"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          >
            {state.merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Selected branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {state.branches
              .filter((branch) => branch.merchantId === merchantId)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </div>
        <nav>
          {nav.map(([name, path, Icon]) => (
            <Link
              key={path}
              className={tab === path ? "active" : ""}
              href={`/${role}/${path}`}
            >
              <Icon size={17} />
              {name}
              {path === "orders" && (
                <span>
                  {orders.filter((o) => o.status === "Pending").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="workspace-user">
          <span>{admin ? "SA" : "MR"}</span>
          <div>
            <b>
              {admin
                ? "Super Admin"
                : managers(state).find((m) => m.merchantId === merchantId)
                    ?.name}
            </b>
            <small>Development role · not authenticated</small>
          </div>
        </div>
      </aside>
      <div className="ops-main">
        <div className="ops-top">
          <span>
            {admin ? "Platform" : "Workspace"} <span>/</span> {title}
          </span>
          <div>
            <span className="live-dot" /> Shared local demo{" "}
            <Link href="/account/notifications">
              <Bell size={18} />
            </Link>
          </div>
        </div>
        <div className="ops-heading">
          <div>
            <div className="eyebrow">
              {admin
                ? "THE BIG PICTURE, BEAUTIFULLY CLEAR"
                : merchants[0]?.name.toUpperCase()}
            </div>
            <h1>
              {tab
                ? title
                : admin
                  ? "Every neighbourhood. One view."
                  : "A good day starts here."}
            </h1>
            <p>
              {tab
                ? "Manage your business with a little more clarity."
                : "Here’s what’s happening across your " +
                  (admin ? "marketplace." : "store today.")}
            </p>
          </div>
          {tab !== "products" && (
            <button className="btn light" onClick={exportStatement}>
              Export statement <ArrowUpRight size={16} />
            </button>
          )}
        </div>
        <div className="ops-demo">
          DEVELOPMENT ONLY · Local browser data · No authentication, real
          payments, or payouts
        </div>
        {(!tab || tab === "analytics" || tab === "earnings") && (
          <>
            <div className="metrics">
              {[
                [
                  admin ? "Delivered order value" : "Delivered sales",
                  money(gross),
                  "From completed demo orders",
                ],
                [
                  "Active orders",
                  orders.filter(
                    (o) => !["Delivered", "Cancelled"].includes(o.status),
                  ).length,
                  "Across the current workspace",
                ],
                [
                  admin ? "Active merchants" : "Available riders",
                  admin
                    ? state.merchants.filter((m) => m.approved).length
                    : riders.filter(
                        (r) => r.availability === "Available" && r.enabled,
                      ).length,
                  admin
                    ? "Approved storefronts"
                    : "Associated with this merchant",
                ],
                [
                  "Completed deliveries",
                  orders.filter((o) => o.status === "Delivered").length,
                  "Shared demo order ledger",
                ],
              ].map(([label, value, note]) => (
                <div className="metric" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <span>{note}</span>
                </div>
              ))}
            </div>
            <div className="chart-grid">
              <div className="ops-panel">
                <div className="panel-title">
                  <h3>Order value · last 7 demo days</h3>
                  <span>Current demo data</span>
                </div>
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={Array.from({ length: 7 }, (_, i) => {
                        const latest = Math.max(
                          ...orders.map((o) => new Date(o.createdAt).getTime()),
                          new Date("2026-10-28T12:00:00Z").getTime(),
                        );
                        const date = new Date(latest - (6 - i) * 86400000)
                          .toISOString()
                          .slice(0, 10);
                        return {
                          name: new Date(date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Kolkata",
                          }),
                          value: orders
                            .filter(
                              (o) =>
                                o.createdAt.slice(0, 10) === date &&
                                o.status !== "Cancelled",
                            )
                            .reduce((n, o) => n + o.total, 0),
                        };
                      })}
                    >
                      <defs>
                        <linearGradient
                          id="chart-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#d9ef7b"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#d9ef7b"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff0c" vertical={false} />
                      <XAxis dataKey="name" stroke="#96909b" tickLine={false} />
                      <YAxis stroke="#96909b" tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#26242d",
                          border: "1px solid #555",
                          borderRadius: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#d9ef7b"
                        strokeWidth={3}
                        fill="url(#chart-fill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="ops-panel">
                <h3>Order mix</h3>
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        "Pending",
                        "Preparing",
                        "Out for delivery",
                        "Delivered",
                      ].map((status) => ({
                        name:
                          status === "Out for delivery" ? "On route" : status,
                        count: orders.filter((o) => o.status === status).length,
                      }))}
                    >
                      <XAxis dataKey="name" stroke="#96909b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ background: "#26242d", border: 0 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#a995ba"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <OrderTable
              orders={orders.slice(0, 5)}
              onDetail={setDetail}
              act={act}
            />
          </>
        )}
        {tab === "orders" && (
          <>
            <div className="ops-filters">
              <div className="searchbox">
                <Search size={17} />
                <input
                  placeholder="Search order ID…"
                  aria-label="Search orders"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                aria-label="Order status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "All",
                  "Pending",
                  "Accepted",
                  "Preparing",
                  "Ready",
                  "Out for delivery",
                  "Delivered",
                  "Cancelled",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <OrderTable
              orders={orders.filter(
                (o) =>
                  o.id.toLowerCase().includes(query.toLowerCase()) &&
                  (status === "All" || o.status === status),
              )}
              onDetail={setDetail}
              act={act}
            />
          </>
        )}
        {tab === "products" && <CatalogManagement merchantId={merchantId} branchId={branchId} admin={admin} />}
        {tab === "riders" && (
          <RiderManagement admin={admin} merchantId={merchantId} />
        )}
        {["restaurants", "stores", "approvals"].includes(tab) && (
          <MerchantDirectory
            approvals={tab === "approvals"}
            kind={
              tab === "restaurants"
                ? "food"
                : tab === "stores"
                  ? "grocery"
                  : undefined
            }
          />
        )}
        {tab === "branches" && (
          <BranchManagement merchantId={merchantId} admin={admin} />
        )}
        {tab === "customers" && (
          <div className="ops-panel">
            <h3>Customers</h3>
            {customers(state).map((c) => (
              <div className="rider-row" key={c.id}>
                <span className="avatar">{c.name[0]}</span>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {c.email} · {c.phone}
                  </small>
                </div>
                <span>
                  {state.orders.filter((o) => o.customerId === c.id).length}{" "}
                  orders
                </span>
              </div>
            ))}
          </div>
        )}
        {["settlements", "balances", "payments", "refunds"].includes(tab) && (
          <FinancePanel
            tab={tab}
            title={title}
            orders={orders}
            onDetail={setDetail}
            onExport={exportStatement}
          />
        )}
        {tab === "deductions" && (
          <div className="ops-panel">
            <span className="status">Not configured</span>
            <h2>Define it when the business is ready.</h2>
            <p>
              No commission, deduction or tax rates are assumed in Phase 1.
              Gross order values remain visible for review.
            </p>
            <label className="field">
              Configuration notes
              <textarea
                placeholder="Document proposed rules for Phase 2…"
                value={state.deductionNotes}
                onChange={(e) => {
                  const value = e.target.value;
                  setState((s) => ({ ...s, deductionNotes: value }));
                }}
              />
            </label>
          </div>
        )}
        {tab === "promotions" && (
          <div className="ops-panel">
            <h3>Neighbourhood treats</h3>
            {state.promotions.map((p) => (
              <div className="rider-row" key={p.code}>
                <Tag />
                <div>
                  <b>{p.code}</b>
                  <small>Illustrative ₹100 off orders of ₹499+</small>
                </div>
                <button
                  className="btn"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      promotions: s.promotions.map((x) =>
                        x.code === p.code ? { ...x, enabled: !x.enabled } : x,
                      ),
                    }))
                  }
                >
                  {p.enabled ? "Pause offer" : "Enable offer"}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === "support" && (
          <div className="ops-panel">
            <h3>Support cases</h3>
            {state.support.length ? (
              state.support.map((c) => (
                <div className="rider-row" key={c.id}>
                  <div>
                    <b>{c.id}</b>
                    <small>{c.subject}</small>
                  </div>
                  <span className="status">{c.status}</span>
                  <button
                    className="text-link"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        support: s.support.map((x) =>
                          x.id === c.id
                            ? {
                                ...x,
                                status:
                                  x.status === "Open" ? "Resolved" : "Open",
                              }
                            : x,
                        ),
                      }))
                    }
                  >
                    {c.status === "Open" ? "Resolve" : "Reopen"}
                  </button>
                </div>
              ))
            ) : (
              <p>No cases yet. Customer support requests appear here.</p>
            )}
          </div>
        )}
        {tab === "audit" && (
          <div className="ops-panel">
            <h3>Activity trail</h3>
            {state.audit.length ? (
              state.audit.map((a) => (
                <div className="cart-row" key={a.id}>
                  <Activity size={16} />
                  {a.message}
                </div>
              ))
            ) : (
              <p>Order and merchant management actions will appear here.</p>
            )}
          </div>
        )}
        {tab === "notifications" && (
          <div className="ops-panel">
            <h3>Demo notification center</h3>
            {state.notifications.map((n) => (
              <div className="cart-row" key={n.id}>
                <Bell size={16} />
                {n.title}
              </div>
            ))}
          </div>
        )}
        {tab === "settings" && (
          <>
          <MerchantProfileEditor merchantId={merchantId} admin={admin} />
          <div className="ops-panel">
            <h3>{admin ? "Platform preferences" : "Business preferences"}</h3>
            <label className="radio-row">
              <input
                type="checkbox"
                checked={
                  admin ? state.settings.storeOpen : !!merchants[0]?.open
                }
                onChange={(e) => {
                  const open = e.target.checked;
                  setState((s) =>
                    admin
                      ? { ...s, settings: { ...s.settings, storeOpen: open } }
                      : {
                          ...s,
                          merchants: s.merchants.map((m) =>
                            m.id === merchantId ? { ...m, open } : m,
                          ),
                        },
                  );
                }}
              />
              Demo store accepting orders
            </label>
            <p>
              Active branch: {state.branches.find((branch) => branch.id === branchId)?.name ?? "No branch selected"}
            </p>
            <p className="demo-notice">
              Browser-local development data only. Real merchant access control
              remains isolated in the future provider layer.
            </p>
          </div>
          </>
        )}
      </div>
      {detail && (
        <Modal title={`Order ${detail.id}`} onClose={() => setDetail(null)}>
          <OrderDetail
            order={state.orders.find((o) => o.id === detail.id)!}
            act={act}
          />
        </Modal>
      )}
    </div>
  );
}
