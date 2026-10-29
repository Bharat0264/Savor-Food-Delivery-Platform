"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useDemo } from "./provider";
import { Empty } from "./ui";
import { MockMap } from "./account";
import { deliveryOperations } from "@/lib/services";
import { brand } from "@/lib/brand";
import { Order } from "@/lib/model";
export function RiderApp({ tab = "" }: { tab?: string }) {
  const { state, setState, toast } = useDemo();
  const riderId = state.selection.riderId;
  const setRiderId = (riderId: string) =>
    setState((s) => ({ ...s, selection: { ...s.selection, riderId } }));
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const rider = state.riders.find((r) => r.id === riderId)!;
  const assignments = state.orders.filter(
    (o) => o.riderId === riderId && rider.merchantIds.includes(o.merchantId),
  );
  const completed = assignments.filter((o) => o.status === "Delivered");
  const act = (o: Order) => {
    if (!rider.enabled) {
      toast("Your demo rider is disabled. Contact the merchant.");
      return;
    }
    try {
      const updated = o.deliveryState === "at_destination" ? deliveryOperations.verifyOtp(state, riderId, o.id, otp) : deliveryOperations.riderTransition(state, riderId, o.id, o.deliveryState === "assigned" ? "accept" : o.deliveryState === "accepted" ? "arrive_pickup" : o.deliveryState === "at_pickup" ? "pickup" : "arrive_destination");
      setState(() => updated);
      setOtp("");
      toast(
        "Delivery progress updated.",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <section className="rider-app">
      <div className="rider-header">
        <div className="eyebrow">
          {brand.name.toUpperCase()} / DELIVERY PARTNER
        </div>
        <select
          aria-label="Demo rider"
          value={riderId}
          onChange={(e) => setRiderId(e.target.value)}
        >
          {state.riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rider-welcome">
        <span className="avatar">
          {rider.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </span>
        <h1>
          Hey, {rider.name.split(" ")[0]}.<br />
          <em>Let’s deliver some good.</em>
        </h1>
        <p>
          {rider.merchantIds
            .map((id) => state.merchants.find((m) => m.id === id)?.name)
            .join(" · ")}
        </p>
        <div className="chips">
          {(["Available", "Busy", "Offline"] as const).map((a) => (
            <button
              className={rider.availability === a ? "chip active" : "chip"}
              key={a}
              disabled={!rider.enabled}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  riders: s.riders.map((r) =>
                    r.id === riderId ? { ...r, availability: a } : r,
                  ),
                }))
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <nav className="rider-tabs">
        {[
          ["", "Today"],
          ["completed", "Completed"],
          ["earnings", "Earnings"],
          ["profile", "Profile"],
        ].map(([path, name]) => (
          <Link
            className={tab === path ? "active" : ""}
            href={`/rider/${path}`}
            key={path}
          >
            {name}
          </Link>
        ))}
      </nav>
      {tab === "earnings" ? (
        <div className="panel">
          <h2>Your delivery summary</h2>
          <strong className="big-number">{completed.length}</strong>
          <p>Completed demo deliveries</p>
          <p className="demo-notice">
            Rider compensation is not configured. Earnings: not calculated. No
            invented payout rates.
          </p>
        </div>
      ) : tab === "profile" ? (
        <div className="panel">
          <h2>{rider.name}</h2>
          <p>Memberships: {rider.merchantIds.join(", ")}</p>
          <p>Status: {rider.enabled ? "Enabled" : "Disabled"}</p>
          <label className="radio-row">
            <input
              type="checkbox"
              checked={state.settings.notifications}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: { ...s.settings, notifications: e.target.checked },
                }))
              }
            />
            Delivery notifications
          </label>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>
              {tab === "completed" ? "Goodness delivered" : "Your deliveries"}
            </h2>
            <span>
              {tab === "completed"
                ? completed.length
                : assignments.filter(
                    (o) => !["Delivered", "Cancelled"].includes(o.status),
                  ).length}{" "}
              orders
            </span>
          </div>
          {(tab === "completed"
            ? completed
            : assignments.filter(
                (o) => !["Delivered", "Cancelled"].includes(o.status),
              )
          ).map((o) => (
            <div className="panel delivery-card" key={o.id}>
              <div className="panel-title">
                <h3>{o.id}</h3>
                <span className="status">{o.status}</span>
              </div>
              <div className="pickup-info">
                <span>01</span>
                <div>
                  <small>PICKUP</small>
                  <b>
                    {state.merchants.find((m) => m.id === o.merchantId)?.name}
                  </b>
                  <p>
                    {
                      state.merchants.find((m) => m.id === o.merchantId)
                        ?.address
                    }
                  </p>
                </div>
              </div>
              <div className="pickup-info">
                <span>02</span>
                <div>
                  <small>DELIVER TO</small>
                  <b>{o.address}</b>
                  <p>{o.instructions}</p>
                </div>
              </div>
              <MockMap moving={o.status === "Out for delivery"} />
              {o.deliveryState === "at_destination" && (
                <label className="field">
                  Delivery OTP
                  <input
                    aria-label="Delivery OTP"
                    inputMode="numeric"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Ask customer for demo OTP"
                  />
                </label>
              )}
              {o.deliveryState && o.deliveryState !== "unassigned" && o.status !== "Delivered" ? (
                <button className="btn full" onClick={() => act(o)}>
                  <Check size={18} />
                  {o.deliveryState === "at_destination" ? "Verify OTP & complete delivery" : o.deliveryState === "assigned" ? "Accept assignment" : o.deliveryState === "accepted" ? "Reached pickup" : o.deliveryState === "at_pickup" ? "Confirm pickup" : "Reached destination"}
                </button>
              ) : (
                o.status !== "Delivered" && (
                  <p className="demo-notice">
                    Waiting for the merchant to mark this order ready.
                  </p>
                )
              )}
              <button
                className="text-link"
                onClick={() => router.push("/account/help")}
              >
                Demo support →
              </button>
            </div>
          ))}
          {!(
            tab === "completed"
              ? completed
              : assignments.filter(
                  (o) => !["Delivered", "Cancelled"].includes(o.status),
                )
          ).length && (
            <Empty
              title="Ready for a little good?"
              description="Assignments from your associated merchants will appear here."
            />
          )}
        </>
      )}
    </section>
  );
}
