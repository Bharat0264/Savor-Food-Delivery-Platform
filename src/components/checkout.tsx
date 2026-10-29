"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus, Minus, Check, MapPin } from "lucide-react";
import { useDemo } from "./provider";
import { Empty } from "./ui";
import { moneyPaise } from "@/lib/brand";
import { cartService, checkoutService, quoteCart } from "@/lib/services";
import { CartEditor } from "./cart-editor";
export function Checkout() {
  const { state, setState, toast } = useDemo();
  const router = useRouter();
  const [address, setAddress] = useState(state.addresses[0]?.id || "");
  const [promo, setPromo] = useState("");
  const [instructions, setInstructions] = useState("");
  const [payment, setPayment] = useState("Demo UPI");
  const [failure, setFailure] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const cart = state.cart;
  let quote;
  try { quote = quoteCart(state, promo || undefined); } catch { quote = { subtotalPaise: cart.items.reduce((n, i) => n + i.lineTotalPaise, 0), deliveryFeePaise: 4000, taxPaise: 0, discountPaise: 0, totalPaise: cart.items.reduce((n, i) => n + i.lineTotalPaise, 0) + 4000, priceChanged: false }; }
  const quantity = (index: number, delta: number) =>
    setState((s) => cartService.setQuantity(s, s.cart.items[index].id, s.cart.items[index].quantity + delta));
  async function place() {
    if (!state.addresses.some((a) => a.id === address)) {
      toast("Choose a delivery address");
      return;
    }
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 650));
    try {
      const result = checkoutService.place(state, {
        addressId: address,
        instructions,
        paymentMethod: payment,
        idempotencyKey: crypto.randomUUID(),
        promotionCode: promo || undefined,
        paymentOutcome: failure ? "failure" : "success",
        now: new Date().toISOString(),
      });
      if (!result.orderId) { setState(() => result.state); setPlacing(false); toast("Simulated payment failure. Your bag is safe; try again."); return; }
      setState(() => result.state);
      router.push(`/orders/${result.orderId}?confirmed=1`);
    } catch (error) {
      toast((error as Error).message);
      setPlacing(false);
    }
  }
  if (!cart.items.length)
    return (
      <Empty
        title="A little room for something good."
        description="Your bag is empty. Your next favourite is waiting."
        href="/food"
      />
    );
  return (
    <section className="section checkout">
      {editIndex !== null && (
        <CartEditor index={editIndex} onClose={() => setEditIndex(null)} />
      )}
      <div className="section-heading">
        <div>
          <div className="eyebrow">GOOD THINGS ARE ON THE WAY</div>
          <h1>
            Your happy <em>little bag.</em>
          </h1>
          <p>
            From {state.merchants.find((m) => m.id === cart.merchantId)?.name}
          </p>
        </div>
        <Link href={`/store/${cart.merchantId}`} className="text-link">
          Add more goodness <Plus size={16} />
        </Link>
      </div>
      <div className="checkout-grid">
        <div>
          <div className="panel">
            <h2>Your order</h2>
            {cart.items.map((i, index) => (
              <div
                className="cart-row"
                key={`${i.productId}${i.option}${index}`}
              >
                <div>
                  <b>{i.name}</b>
                  <small>{i.option}</small>
                  <button
                    className="text-link"
                    onClick={() => setEditIndex(index)}
                  >
                    Customize item
                  </button>
                </div>
                <div className="quantity">
                  <button
                    aria-label={`Remove one ${i.name}`}
                    onClick={() => quantity(index, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  {i.quantity}
                  <button
                    aria-label={`Add one ${i.name}`}
                    onClick={() => quantity(index, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <b>{moneyPaise(i.lineTotalPaise)}</b>
              </div>
            ))}
          </div>
          {quote.priceChanged && <div className="panel"><p className="form-error">A catalog price changed since this item was added. Review the refreshed total before placing your order.</p></div>}
          <div className="panel">
            <h2>
              <MapPin size={21} /> Deliver to your happy place
            </h2>
            {state.addresses.map((a) => (
              <label key={a.id} className="radio-row">
                <input
                  type="radio"
                  name="address"
                  checked={address === a.id}
                  onChange={() => setAddress(a.id)}
                />
                <div>
                  <b>{a.label}</b>
                  <small>{a.line}</small>
                </div>
              </label>
            ))}
            <Link className="text-link" href="/account/addresses">
              Add an address →
            </Link>
            <label className="field">
              Delivery instructions
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="A landmark, doorbell preference, or a little note…"
              />
            </label>
          </div>
          <div className="panel">
            <h2>How would you like to pay?</h2>
            <p className="demo-notice">
              Demo payments only. No money is collected.
            </p>
            {["Demo UPI", "Demo card", "Demo cash on delivery"].map((p) => (
              <label key={p} className="radio-row">
                <input
                  name="payment"
                  type="radio"
                  checked={payment === p}
                  onChange={() => setPayment(p)}
                />
                {p}
              </label>
            ))}
            <label className="radio-row">
              <input
                type="checkbox"
                checked={failure}
                onChange={(e) => setFailure(e.target.checked)}
              />
              Test a payment failure
            </label>
          </div>
        </div>
        <aside className="panel order-summary">
          <h2>A little breakdown</h2>
          <div className="promo">
            <input
              aria-label="Promo code"
              placeholder="Promo code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
            />
            <button
              onClick={() => {
                if (
                  promo.toUpperCase() === "FIRSTBITE" &&
                  quote.discountPaise > 0
                ) {
                  toast("₹100 of first-bite happiness applied");
                } else toast("Use FIRSTBITE on a subtotal of ₹499 or more.");
              }}
            >
              Apply
            </button>
          </div>
          <dl>
            <div>
              <dt>Item total</dt>
              <dd>{moneyPaise(quote.subtotalPaise)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{moneyPaise(quote.deliveryFeePaise)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>− {moneyPaise(quote.discountPaise)}</dd>
            </div>
            <div className="total">
              <dt>To pay</dt>
              <dd>{moneyPaise(quote.totalPaise)}</dd>
            </div>
          </dl>
          <button className="btn full" disabled={placing || quote.priceChanged} onClick={place}>
            {placing ? "Placing your demo order…" : "Place demo order"}
            <ArrowUpRight size={18} />
          </button>
          <small>
            <Check size={13} /> Simulated checkout. Real good design.
          </small>
        </aside>
      </div>
    </section>
  );
}
