"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  MapPin,
  Bike,
  Star,
  Plus,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useDemo } from "./provider";
import { Empty, MerchantCard, Modal } from "./ui";
import { money } from "@/lib/brand";
export function MockMap({ moving = false }: { moving?: boolean }) {
  return (
    <div className="mock-map">
      <div className="map-block block-a" />
      <div className="map-block block-b" />
      <div className="map-block block-c" />
      <div className="map-park">Neighbourhood park</div>
      <span className="map-street">5TH CROSS ROAD</span>
      <svg viewBox="0 0 600 260" preserveAspectRatio="none">
        <path
          d="M90 190 L240 190 L240 80 L490 80"
          fill="none"
          stroke="#fff"
          strokeWidth="15"
        />
        <path
          d="M90 190 L240 190 L240 80 L490 80"
          fill="none"
          stroke="#6d8151"
          strokeWidth="5"
          strokeDasharray="8 5"
        />
      </svg>
      <span className="map-start">
        <ShoppingPin />
      </span>
      <span className="map-end">
        <MapPin />
      </span>
      <span className={`map-rider ${moving ? "moving" : ""}`}>
        <Bike size={21} />
      </span>
      <span className="map-label">ILLUSTRATIVE DEMO MAP · NO LIVE GPS</span>
    </div>
  );
}
function ShoppingPin() {
  return <span>✳</span>;
}
export function Tracking({ id }: { id: string }) {
  const { state, setState, toast } = useDemo();
  const [rating, setRating] = useState(5);
  const confirmed = useSearchParams().get("confirmed") === "1";
  const reduced = useReducedMotion();
  const [feedback, setFeedback] = useState("");
  const [contact, setContact] = useState(false);
  const order = state.orders.find(
    (o) => o.id === id && o.customerId === state.customer.id,
  );
  if (!order)
    return (
      <Empty
        title="Order not found"
        description="Your orders live in your account."
        href="/account/orders"
        label="View order history"
      />
    );
  const merchant = state.merchants.find((m) => m.id === order.merchantId);
  const rider = state.riders.find((r) => r.id === order.riderId);
  const steps = [
    "Pending",
    "Accepted",
    "Preparing",
    "Ready",
    "Out for delivery",
    "Delivered",
  ];
  return (
    <section className="section tracking">
      {confirmed && order.status === "Pending" && (
        <motion.div
          className="confirmation"
          initial={reduced ? false : { opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 130, damping: 18 }}
        >
          <span>
            <Check size={24} />
          </span>
          <div>
            <b>Your little moment of joy is confirmed.</b>
            <small>Demo order placed. No payment was collected.</small>
          </div>
        </motion.div>
      )}
      <div className="section-heading">
        <div>
          <div className="eyebrow">{order.id} · DEMO ORDER</div>
          <h1>
            {order.status === "Delivered" ? (
              <>
                Goodness, <em>delivered.</em>
              </>
            ) : (
              <>
                Your next <em>happy moment.</em>
              </>
            )}
          </h1>
          <p>
            {order.status === "Delivered"
              ? "Hope that hit the spot. Thank you for shopping local."
              : `Fresh from ${merchant?.name}. Seeded estimate: 25–35 minutes.`}
          </p>
        </div>
        <span className="status">{order.status}</span>
      </div>
      <div className="checkout-grid">
        <div>
          <MockMap moving={order.status === "Out for delivery"} />
          <div className="panel">
            <h2>A little closer with every step</h2>
            <div className="timeline">
              {steps.map((s, i) => (
                <div
                  className={steps.indexOf(order.status) >= i ? "done" : ""}
                  key={s}
                >
                  <span>
                    {steps.indexOf(order.status) >= i ? (
                      <Check size={13} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div>
                    <b>{s === "Pending" ? "Order received" : s}</b>
                    <small>
                      {s === "Pending"
                        ? "Your merchant will take it from here"
                        : s === "Delivered"
                          ? "A happy little delivery"
                          : s === "Out for delivery"
                            ? "Your rider has picked up your order"
                            : "Updated through the merchant / rider demo"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside>
          <div className="panel">
            <h3>{rider ? rider.name : "Finding your delivery partner"}</h3>
            <p>
              {rider
                ? "Your neighbourhood delivery partner"
                : "A merchant will assign an associated rider."}
            </p>
            {rider && (
              <button
                className="btn light full"
                onClick={() => setContact(true)}
              >
                Contact & support
              </button>
            )}
            <div className="otp">
              <small>DEMO DELIVERY OTP</small>
              <strong>{order.otp}</strong>
              <p>Use this code in the rider view to complete delivery.</p>
            </div>
            <p>
              <MapPin size={15} /> {order.address}
            </p>
          </div>
          <div className="panel">
            <h3>Your order</h3>
            {order.items.map((i, j) => (
              <div className="summary-line" key={j}>
                <span>
                  {i.quantity} × {i.name}
                </span>
                <b>{money(i.price * i.quantity)}</b>
              </div>
            ))}
            <div className="summary-line total">
              <b>Total · {order.payment}</b>
              <b>{money(order.total)}</b>
            </div>
          </div>
          {order.status === "Delivered" && (
            <div className="panel">
              <h3>A little feedback?</h3>
              {order.rating ? (
                <p>
                  Thank you for your {order.rating}-star review.{" "}
                  {order.feedback}
                </p>
              ) : (
                <>
                  <div className="rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        aria-label={`Rate ${n} stars`}
                        key={n}
                        onClick={() => setRating(n)}
                      >
                        <Star fill={n <= rating ? "#c79b35" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    aria-label="Review"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what made your day…"
                  />
                  <button
                    className="btn full"
                    onClick={() => {
                      setState((s) => ({
                        ...s,
                        orders: s.orders.map((o) =>
                          o.id === id ? { ...o, rating, feedback } : o,
                        ),
                      }));
                      toast("Thank you. Your feedback means a lot.");
                    }}
                  >
                    Share feedback
                  </button>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      {contact && (
        <Modal
          title="A little help, right here"
          onClose={() => setContact(false)}
        >
          <p>
            Demo contact preview: {rider?.name}. Calling and messaging will be
            connected in Phase 2.
          </p>
          <Link className="btn full" href="/account/help">
            Create a support request
          </Link>
        </Modal>
      )}
    </section>
  );
}
const tabs = [
  "Profile",
  "Addresses",
  "Orders",
  "Favorites",
  "Notifications",
  "Help",
  "Settings",
];
export function Account({ tab = "profile" }: { tab?: string }) {
  const { state, setState, toast } = useDemo();
  const [name, setName] = useState(state.customer.name);
  const [email, setEmail] = useState(state.customer.email);
  useEffect(() => {
    setName(state.customer.name);
    setEmail(state.customer.email);
  }, [state.customer.name, state.customer.email]);
  const [label, setLabel] = useState("Home");
  const [line, setLine] = useState("");
  const [subject, setSubject] = useState("");
  return (
    <section className="section account">
      <div className="eyebrow">YOUR LITTLE CORNER</div>
      <h1>
        Hello, <em>{state.customer.name.split(" ")[0]}.</em>
      </h1>
      <div className="account-layout">
        <nav className="account-tabs">
          {tabs.map((t) => (
            <Link
              className={tab === t.toLowerCase() ? "active" : ""}
              key={t}
              href={`/account/${t.toLowerCase()}`}
            >
              {t}
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </nav>
        <div>
          {tab === "profile" && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                setState((s) => ({
                  ...s,
                  customer: { ...s.customer, name, email },
                }));
                toast("Profile saved");
              }}
            >
              <h2>Good to know you.</h2>
              <label className="field">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <p className="demo-notice">
                Development identity. This is not authentication.
              </p>
              <button className="btn">Save profile</button>
            </form>
          )}
          {tab === "addresses" && (
            <div className="panel">
              <h2>Your happy places</h2>
              {state.addresses.map((a) => (
                <div className="cart-row" key={a.id}>
                  <MapPin />
                  <div>
                    <b>{a.label}</b>
                    <p>{a.line}</p>
                  </div>
                  <button
                    className="icon"
                    aria-label={`Delete ${a.label}`}
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        addresses: s.addresses.filter((x) => x.id !== a.id),
                      }))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setState((s) => ({
                    ...s,
                    addresses: [
                      ...s.addresses,
                      { id: crypto.randomUUID(), label, line },
                    ],
                  }));
                  setLine("");
                  toast("Address added");
                }}
              >
                <label className="field">
                  Label
                  <input
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
                <label className="field">
                  Full address
                  <textarea
                    required
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                  />
                </label>
                <button className="btn">
                  <Plus size={16} />
                  Add address
                </button>
              </form>
            </div>
          )}
          {tab === "orders" && (
            <div className="panel">
              <h2>Good memories, great meals.</h2>
              {state.orders
                .filter((o) => o.customerId === state.customer.id)
                .map((o) => (
                  <Link
                    className="order-history"
                    key={o.id}
                    href={`/orders/${o.id}`}
                  >
                    <div>
                      <b>
                        {
                          state.merchants.find((m) => m.id === o.merchantId)
                            ?.name
                        }
                      </b>
                      <small>
                        {o.id} · {o.items.map((i) => i.name).join(", ")}
                      </small>
                    </div>
                    <span className="status">{o.status}</span>
                    <b>{money(o.total)}</b>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
            </div>
          )}
          {tab === "favorites" && (
            <div className="merchant-grid">
              {state.merchants
                .filter((m) => state.favorites.includes(m.id))
                .map((m) => (
                  <MerchantCard key={m.id} merchant={m} />
                ))}
              {!state.favorites.length && (
                <Empty
                  title="Save a little love"
                  description="Tap a heart on any merchant to find it here."
                />
              )}
            </div>
          )}
          {tab === "notifications" && (
            <div className="panel">
              <h2>A little heads up</h2>
              <button
                className="text-link"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    notifications: s.notifications.map((n) => ({
                      ...n,
                      read: true,
                    })),
                  }))
                }
              >
                Mark all read
              </button>
              {state.notifications.map((n) => (
                <div className="cart-row" key={n.id}>
                  <span>{n.read ? "○" : "●"}</span>
                  {n.title}
                </div>
              ))}
            </div>
          )}
          {tab === "help" && (
            <div className="panel">
              <h2>We’re here to help.</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setState((s) => ({
                    ...s,
                    support: [
                      {
                        id: `SUP-${s.support.length + 1}`,
                        subject,
                        status: "Open",
                      },
                      ...s.support,
                    ],
                  }));
                  setSubject("");
                  toast("Demo support request created");
                }}
              >
                <label className="field">
                  What can we help with?
                  <textarea
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
                <button className="btn">Create demo request</button>
              </form>
              {state.support.map((s) => (
                <div className="cart-row" key={s.id}>
                  <b>{s.id}</b>
                  <span>{s.subject}</span>
                  <span className="status">{s.status}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "settings" && (
            <div className="panel">
              <h2>Your preferences</h2>
              <label className="radio-row">
                <input
                  type="checkbox"
                  checked={state.settings.notifications}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      settings: {
                        ...s.settings,
                        notifications: e.target.checked,
                      },
                    }))
                  }
                />
                Product and order notifications
              </label>
              <p>Motion follows your device’s reduced-motion preference.</p>
              <p className="demo-notice">
                Data is saved only in this browser. No external services are
                connected.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
