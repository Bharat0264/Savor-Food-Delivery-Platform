"use client";
import Link from "next/link";
import { Shell } from "./shell";
import { Home } from "./home";
import { Discovery, Store, Checkout } from "./shop";
import { Account, Tracking } from "./account";
import dynamic from "next/dynamic";
const Operations = dynamic(() =>
  import("./operations").then((m) => m.Operations),
);
const RiderApp = dynamic(() => import("./rider").then((m) => m.RiderApp));
import { Empty } from "./ui";
import { useDemo } from "./provider";
import { AuthPanel } from "./auth-panel";
export function App({ segments: s }: { segments: string[] }) {
  const { state, toast } = useDemo();
  let page;
  if (!s.length) page = <Home />;
  else if (s[0] === "food" || s[0] === "grocery")
    page = <Discovery kind={s[0]} />;
  else if (s[0] === "store") page = <Store id={s[1]} />;
  else if (s[0] === "cart" || s[0] === "checkout") page = <Checkout />;
  else if (s[0] === "orders") page = <Tracking id={s[1]} />;
  else if (s[0] === "account") page = <Account tab={s[1]} />;
  else if (s[0] === "auth") page = <AuthPanel />;
  else if (s[0] === "merchant" || s[0] === "admin")
    page = <Operations role={s[0]} tab={s[1]} />;
  else if (s[0] === "rider") page = <RiderApp tab={s[1]} />;
  else if (s[0] === "offers")
    page = (
      <section className="section offers-page">
        <div className="eyebrow">A LITTLE EXTRA HAPPINESS</div>
        <h1>
          Good things.
          <br />
          <em>Even better offers.</em>
        </h1>
        {state.promotions
          .filter((p) => p.enabled)
          .map((p) => (
            <div className="offer-banner" key={p.code}>
              <div>
                <h2>
                  Your first bite, <em>₹100 lighter.</em>
                </h2>
                <p>
                  ₹100 off a subtotal of ₹499 or more. Illustrative demo offer.
                </p>
                <button
                  className="coupon"
                  onClick={() => {
                    navigator.clipboard?.writeText(p.code).catch(() => {});
                    toast(`Use ${p.code} at checkout`);
                  }}
                >
                  {p.code} · Copy code
                </button>
              </div>
              <Link className="btn light" href="/food">
                Find something delicious ↗
              </Link>
            </div>
          ))}
      </section>
    );
  else
    page = (
      <Empty
        title="A little lost?"
        description="Let’s get you back to something delicious."
        href="/"
        label="Back home"
      />
    );
  return <Shell>{page}</Shell>;
}
