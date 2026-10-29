"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Leaf, MapPin, Minus, Plus, Search, ShoppingBag, Star } from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "./provider";
import { Empty, Modal } from "./ui";
import { CartItem, Product } from "@/lib/model";
import { moneyPaise } from "@/lib/brand";
import { addCartItem } from "@/lib/repository";
import { catalogForBranch } from "@/lib/services";

type Selection = { variantId?: string; addons: Record<string, string[]>; quantity: number };

export function Store({ id }: { id: string }) {
  const { state, setState, toast } = useDemo();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [selection, setSelection] = useState<Selection>({ addons: {}, quantity: 1 });
  const [validation, setValidation] = useState("");
  const [pending, setPending] = useState<CartItem | null>(null);
  const merchant = state.merchants.find((m) => m.id === id);
  const branch = state.branches.find((item) => item.id === state.selection.branchId && item.merchantId === id) ?? state.branches.find((item) => item.merchantId === id);
  const products = useMemo(() => (branch ? catalogForBranch(state, id, branch.id) : []), [branch, id, state]);
  const categories = state.catalogCategories.filter((item) => item.merchantId === id && !item.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!merchant || !branch) return <Empty title="Store not found" description="Discover another neighbourhood favourite." href="/food" />;

  const openProduct = (item: Product) => {
    setProduct(item);
    setValidation("");
    setSelection({ variantId: item.variants.find((variant) => variant.active)?.id, addons: {}, quantity: 1 });
  };
  const unitPrice = () => {
    if (!product) return 0;
    const variant = product.variants.find((item) => item.id === selection.variantId);
    const selected = Object.values(selection.addons).flat();
    return (variant?.pricePaise ?? product.pricePaise) + product.customizationGroups.flatMap((group) => group.addons).filter((addon) => selected.includes(addon.id)).reduce((sum, addon) => sum + addon.pricePaise, 0);
  };
  const commit = (item: CartItem, replace = false) => {
    setState((current) => addCartItem(current, id, item, replace));
    setProduct(null); setPending(null); toast("A little goodness added to your bag");
  };
  const add = () => {
    if (!product) return;
    for (const group of product.customizationGroups) {
      const count = selection.addons[group.id]?.length ?? 0;
      if (count < group.minSelections || count > group.maxSelections) {
        setValidation(`${group.name}: choose ${group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections}–${group.maxSelections}`} option${group.maxSelections === 1 ? "" : "s"}.`);
        return;
      }
    }
    const variant = product.variants.find((item) => item.id === selection.variantId);
    const selected = Object.values(selection.addons).flat();
    const addonNames = product.customizationGroups.flatMap((group) => group.addons).filter((addon) => selected.includes(addon.id)).map((addon) => addon.name);
    const item = { productId: product.id, name: product.name, price: unitPrice() / 100, quantity: selection.quantity, option: [variant?.name, ...addonNames].filter(Boolean).join(" + ") || "Standard" };
    if (state.cart.items.length && state.cart.merchantId !== id) setPending(item); else commit(item);
  };
  const visible = products.filter((item) => (category === "All" || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase()));
  return <>
    <section className="store-hero"><img src={merchant.image} alt={merchant.name} /><div><Link href={`/${merchant.kind}`} className="back-link">← All {merchant.kind === "food" ? "restaurants" : "stores"}</Link><span className="eyebrow">YOUR NEIGHBOURHOOD, AT ITS BEST</span><h1>{merchant.name}</h1><p>{merchant.description}</p><div className="store-badges"><span><Star size={16} /> {merchant.rating} · 200+ ratings</span><span><Clock size={16} />{merchant.eta}</span><span><MapPin size={16} />{branch.name} · {merchant.address}</span></div></div></section>
    <section className="section catalog"><aside><h3>{merchant.kind === "food" ? "On the menu" : "Departments"}</h3>{["All", ...categories.map((item) => item.name)].map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}<div className="mini-note"><Leaf /><p>Freshly prepared.<br />Thoughtfully sourced.</p></div></aside>
      <div><div className="searchbox"><Search size={18} /><input aria-label="Search catalog" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find your favourite…" /></div><div className="product-grid">{visible.map((item) => <article className={`product ${!item.available ? "unavailable" : ""}`} key={item.id}><img src={item.image} alt={item.name} loading="lazy" /><div><span className="veg">{item.vegetarian ? "●" : "◆"}</span><h3>{item.name}</h3><p>{item.description}</p><div className="product-bottom"><b>{moneyPaise(item.pricePaise)}</b><button disabled={!item.available || !merchant.approved || !merchant.open || !branch.acceptingOrders} onClick={() => openProduct(item)}>{item.available ? <><Plus size={15} /> Add</> : item.stock ? "Unavailable" : "Sold out"}</button></div>{item.available && item.stock <= (state.inventory.find((record) => record.branchId === branch.id && record.productId === item.id)?.lowStockThreshold ?? 0) && <small>Only {item.stock} left</small>}</div></article>)}</div>{!visible.length && <Empty title="Nothing in this section yet" description="Try a different search or return later for fresh additions." />}</div>
    </section>
    {state.cart.items.length > 0 && <Link className="floating-cart" href="/cart"><ShoppingBag size={18} />{state.cart.items.reduce((sum, item) => sum + item.quantity, 0)} items <span>View bag →</span></Link>}
    {product && <Modal title={product.name} onClose={() => setProduct(null)}><img className="modal-photo" src={product.image} alt={product.name} /><p>{product.description}</p>{product.variants.length > 0 && <><h4>{merchant.kind === "food" ? "Choose a size" : "Choose a pack"}</h4>{product.variants.filter((item) => item.active).map((variant) => <label className="radio-row" key={variant.id}><input type="radio" checked={selection.variantId === variant.id} onChange={() => { setSelection((current) => ({ ...current, variantId: variant.id })); setValidation(""); }} />{variant.name}<span>{moneyPaise(variant.pricePaise)}{variant.unit ? ` · ${variant.unit}` : ""}</span></label>)}</>}{product.customizationGroups.map((group) => <div className="customization-group" key={group.id}><h4>{group.name} {group.required && <em>Required</em>}</h4><small>Choose {group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections}–${group.maxSelections}`}</small>{group.addons.filter((item) => item.active).map((addon) => { const checked = selection.addons[group.id]?.includes(addon.id) ?? false; return <label className="radio-row" key={addon.id}><input type="checkbox" checked={checked} onChange={() => { const selected = selection.addons[group.id] || []; if (!checked && selected.length >= group.maxSelections) { setValidation(`You can select up to ${group.maxSelections} options for ${group.name}.`); return; } setSelection((current) => ({ ...current, addons: { ...current.addons, [group.id]: checked ? selected.filter((item) => item !== addon.id) : [...selected, addon.id] } })); setValidation(""); }} />{addon.name}<span>+ {moneyPaise(addon.pricePaise)}</span></label>; })}</div>)}<div className="quantity-row"><span>Quantity</span><button aria-label="Reduce quantity" onClick={() => setSelection((current) => ({ ...current, quantity: Math.max(1, current.quantity - 1) }))}><Minus size={15} /></button><b>{selection.quantity}</b><button aria-label="Increase quantity" disabled={selection.quantity >= product.stock} onClick={() => setSelection((current) => ({ ...current, quantity: current.quantity + 1 }))}><Plus size={15} /></button></div>{validation && <p className="form-error" role="alert">{validation}</p>}<motion.button whileTap={{ scale: 0.96 }} className="btn full" onClick={add}>Add to bag · {moneyPaise(unitPrice() * selection.quantity)}<Plus size={18} /></motion.button></Modal>}
    {pending && <Modal title="A fresh bag for a new favourite?" onClose={() => setPending(null)}><p>Your bag contains items from {state.merchants.find((item) => item.id === state.cart.merchantId)?.name}. Each delivery comes from one merchant.</p><button className="btn full" onClick={() => commit(pending, true)}>Replace bag & add item</button><button className="btn light full" onClick={() => setPending(null)}>Keep current bag</button></Modal>}
  </>;
}
