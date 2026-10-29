"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Star,
  Clock,
  Leaf,
  ShoppingBag,
  MapPin,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "./provider";
import { Empty, Modal } from "./ui";
import { Product, CartItem } from "@/lib/model";
import { money } from "@/lib/brand";
import { addCartItem } from "@/lib/repository";
export function Store({ id }: { id: string }) {
  const { state, setState, toast } = useDemo();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [option, setOption] = useState("Regular");
  const [addon, setAddon] = useState(false);
  const [pending, setPending] = useState<CartItem | null>(null);
  const merchant = state.merchants.find((m) => m.id === id);
  if (!merchant)
    return (
      <Empty
        title="Store not found"
        description="Discover another neighbourhood favourite."
        href="/food"
      />
    );
  const products = state.products.filter((p) => p.merchantId === id);
  const commit = (item: CartItem, replace = false) => {
    setState((s) => addCartItem(s, id, item, replace));
    setProduct(null);
    setPending(null);
    toast("A little goodness added to your bag");
  };
  const add = () => {
    if (!product) return;
    const item = {
      productId: product.id,
      name: product.name,
      price:
        product.price +
        (["Large", "Family pack"].includes(option) ? 70 : 0) +
        (addon ? 40 : 0),
      quantity: 1,
      option: option + (addon ? " + extra topping" : ""),
    };
    if (state.cart.items.length && state.cart.merchantId !== id)
      setPending(item);
    else commit(item);
  };
  return (
    <>
      <section className="store-hero">
        <img src={merchant.image} alt={merchant.name} />
        <div>
          <Link href={`/${merchant.kind}`} className="back-link">
            ← All {merchant.kind === "food" ? "restaurants" : "stores"}
          </Link>
          <span className="eyebrow">YOUR NEIGHBOURHOOD, AT ITS BEST</span>
          <h1>{merchant.name}</h1>
          <p>{merchant.description}</p>
          <div className="store-badges">
            <span>
              <Star size={16} /> {merchant.rating} · 200+ ratings
            </span>
            <span>
              <Clock size={16} />
              {merchant.eta}
            </span>
            <span>
              <MapPin size={16} />
              {merchant.address}
            </span>
          </div>
        </div>
      </section>
      <section className="section catalog">
        <aside>
          <h3>{merchant.kind === "food" ? "On the menu" : "Departments"}</h3>
          {["All", ...new Set(products.map((p) => p.category))].map((c) => (
            <button
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
          <div className="mini-note">
            <Leaf />
            <p>
              Freshly prepared.
              <br />
              Thoughtfully sourced.
            </p>
          </div>
        </aside>
        <div>
          <div className="searchbox">
            <Search size={18} />
            <input
              aria-label="Search catalog"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find your favourite…"
            />
          </div>
          <div className="product-grid">
            {products
              .filter(
                (p) =>
                  (category === "All" || p.category === category) &&
                  p.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <article className="product" key={p.id}>
                  <img src={p.image} alt={p.name} loading="lazy" />
                  <div>
                    <span className="veg">●</span>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="product-bottom">
                      <b>{money(p.price)}</b>
                      <button
                        disabled={
                          !p.stock || !merchant.approved || !merchant.open
                        }
                        onClick={() => {
                          setProduct(p);
                          setOption(
                            merchant.kind === "grocery"
                              ? "Standard"
                              : "Regular",
                          );
                          setAddon(false);
                        }}
                      >
                        {p.stock ? (
                          <>
                            <Plus size={15} /> Add
                          </>
                        ) : (
                          "Sold out"
                        )}
                      </button>
                    </div>
                    {p.stock > 0 && p.stock < 5 && (
                      <small>Only {p.stock} left</small>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>
      {state.cart.items.length > 0 && (
        <Link className="floating-cart" href="/cart">
          <ShoppingBag size={18} />
          {state.cart.items.reduce((n, i) => n + i.quantity, 0)} items{" "}
          <span>View bag →</span>
        </Link>
      )}
      {product && (
        <Modal title={product.name} onClose={() => setProduct(null)}>
          <img className="modal-photo" src={product.image} alt={product.name} />
          <p>{product.description}</p>
          <h4>{merchant.kind === "food" ? "Make it yours" : "Pack size"}</h4>
          {(merchant.kind === "food"
            ? ["Regular", "Large"]
            : ["Standard", "Family pack"]
          ).map((o) => (
            <label className="radio-row" key={o}>
              <input
                type="radio"
                checked={option === o}
                onChange={() => setOption(o)}
              />
              {o}
              <span>
                {["Large", "Family pack"].includes(o) ? "+ ₹70" : "Included"}
              </span>
            </label>
          ))}
          {merchant.kind === "food" && (
            <label className="radio-row">
              <input
                type="checkbox"
                checked={addon}
                onChange={(e) => setAddon(e.target.checked)}
              />
              Extra avocado / topping<span>+ ₹40</span>
            </label>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="btn full"
            onClick={add}
          >
            Add to bag ·{" "}
            {money(
              product.price +
                (["Large", "Family pack"].includes(option) ? 70 : 0) +
                (addon ? 40 : 0),
            )}
            <Plus size={18} />
          </motion.button>
        </Modal>
      )}
      {pending && (
        <Modal
          title="A fresh bag for a new favourite?"
          onClose={() => setPending(null)}
        >
          <p>
            Your bag contains items from{" "}
            {state.merchants.find((m) => m.id === state.cart.merchantId)?.name}.
            Each delivery comes from one merchant. Replace your current bag to
            order from {merchant.name}.
          </p>
          <button className="btn full" onClick={() => commit(pending, true)}>
            Replace bag & add item
          </button>
          <button className="btn light full" onClick={() => setPending(null)}>
            Keep current bag
          </button>
        </Modal>
      )}
    </>
  );
}
