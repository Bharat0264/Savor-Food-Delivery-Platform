"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  MapPin,
  ChevronDown,
  ShoppingBag,
  Search,
  User,
  ArrowUpRight,
  Home,
  Heart,
  Package,
  RotateCcw,
  Wallet,
  Settings,
  Bike,
} from "lucide-react";
import { useState, ReactNode } from "react";
import { copy } from "@/lib/copy";
import { brand } from "@/lib/brand";
import { supabaseConfigured } from "@/lib/supabase/env";
import { useDemo } from "./provider";
import { Modal } from "./ui";
export function Shell({ children }: { children: ReactNode }) {
  const { state, reset } = useDemo();
  const [location, setLocation] = useState(false);
  const [address, setAddress] = useState("Koramangala, Bengaluru");
  const router = useRouter();
  const path = usePathname();
  const reduced = useReducedMotion();
  const operational = path.startsWith("/merchant") || path.startsWith("/admin");
  const demoEnabled =
    process.env.NODE_ENV !== "production" && !supabaseConfigured;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!operational && (
        <>
          <div className="announcement">
            {copy.announcement}{" "}
            <span>
              {copy.announcementLink} <ArrowUpRight size={12} />
            </span>
          </div>
          <header className="header">
            <Link href="/" className="logo">
              {brand.name}
              <i>{brand.mark}</i>
            </Link>
            <button className="location" onClick={() => setLocation(true)}>
              <MapPin size={18} />
              <span>
                <small>DELIVERING GOODNESS TO</small>
                {address}
              </span>
              <ChevronDown size={14} />
            </button>
            <nav>
              <Link className={path === "/food" ? "selected" : ""} href="/food">
                Food
              </Link>
              <Link
                className={path === "/grocery" ? "selected" : ""}
                href="/grocery"
              >
                Groceries
              </Link>
              <Link href="/offers">
                Offers <span className="new">NEW</span>
              </Link>
            </nav>
            <div className="header-actions">
              <Link className="icon" aria-label="Search" href="/food?search=1">
                <Search size={20} />
              </Link>
              <Link
                className="icon account-icon"
                aria-label="Account and sign in"
                href="/auth"
              >
                <User size={20} />
              </Link>
              <Link className="bag" href="/cart">
                <ShoppingBag size={18} />
                <span>
                  {state.cart.items.reduce((n, i) => n + i.quantity, 0)}
                </span>
              </Link>
            </div>
          </header>
        </>
      )}
      <main id="main-content">
        <motion.div
          key={path}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {children}
        </motion.div>
      </main>
      {!operational && (
        <footer>
          <Link className="logo" href="/">
            {brand.name}
            <i>{brand.mark}</i>
          </Link>
          <p>{copy.footer.description}</p>
          <div>
            <Link href="/account/help">Get in touch</Link>
            <Link href="/account/settings">Preferences</Link>
            <span>{copy.footer.signoff}</span>
          </div>
        </footer>
      )}
      {demoEnabled && (
        <div className="demo-bar">
          <span>
            <i /> DEVELOPMENT DEMO
          </span>
          <select
            aria-label="Development role switcher"
            value={
              path.startsWith("/merchant")
                ? "merchant"
                : path.startsWith("/rider")
                  ? "rider"
                  : path.startsWith("/admin")
                    ? "admin"
                    : "customer"
            }
            onChange={(e) =>
              router.push(
                e.target.value === "customer" ? "/" : `/${e.target.value}`,
              )
            }
          >
            <option value="customer">Customer view</option>
            <option value="merchant">Merchant view</option>
            <option value="rider">Delivery partner</option>
            <option value="admin">Super admin</option>
          </select>
          <button
            aria-label="Reset demo data"
            onClick={() => {
              if (confirm("Reset all local demo changes?")) reset();
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {(operational
          ? [
              [
                `/${path.startsWith("/admin") ? "admin" : "merchant"}`,
                "Overview",
                Home,
              ],
              [
                `/${path.startsWith("/admin") ? "admin" : "merchant"}/orders`,
                "Orders",
                Package,
              ],
              [
                `/${path.startsWith("/admin") ? "admin" : "merchant"}/riders`,
                "Partners",
                Bike,
              ],
              [
                `/${path.startsWith("/admin") ? "admin" : "merchant"}/settlements`,
                "Ledger",
                Wallet,
              ],
              [
                `/${path.startsWith("/admin") ? "admin" : "merchant"}/settings`,
                "Settings",
                Settings,
              ],
            ]
          : path.startsWith("/rider")
            ? [
                ["/rider", "Today", Home],
                ["/rider/completed", "Completed", Package],
                ["/rider/earnings", "Earnings", Wallet],
                ["/rider/profile", "Profile", User],
              ]
            : [
                ["/", "Home", Home],
                ["/food", "Discover", Search],
                ["/account/favorites", "Saved", Heart],
                ["/account/orders", "Orders", Package],
                ["/account", "You", User],
              ]
        ).map(([href, label, Icon]) => {
          const IconComponent = Icon as typeof Home;
          return (
            <Link key={String(href)} href={String(href)}>
              <IconComponent />
              {String(label)}
            </Link>
          );
        })}
      </nav>
      {location && (
        <Modal
          title="Where’s your happy place?"
          onClose={() => setLocation(false)}
        >
          <p>Choose a demo delivery address.</p>
          {state.addresses.map((a) => (
            <button
              className="address-option"
              key={a.id}
              onClick={() => {
                setAddress(a.label + " · Bengaluru");
                setLocation(false);
              }}
            >
              <MapPin />
              <span>
                <b>{a.label}</b>
                <small>{a.line}</small>
              </span>
            </button>
          ))}
          <Link
            className="text-link"
            href="/account/addresses"
            onClick={() => setLocation(false)}
          >
            Manage addresses →
          </Link>
        </Modal>
      )}
    </>
  );
}
