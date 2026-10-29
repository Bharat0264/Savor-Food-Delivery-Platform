"use client";
import { useState } from "react";
import { Modal } from "./ui";
import { useDemo } from "./provider";
import { moneyPaise } from "@/lib/brand";
export function CartEditor({
  index,
  onClose,
}: {
  index: number;
  onClose: () => void;
}) {
  const { state, setState, toast } = useDemo();
  const item = state.cart.items[index];
  const product = state.products.find((p) => p.id === item?.productId);
  const [option, setOption] = useState(item?.variantName || "Standard");
  const [addon, setAddon] = useState((item?.addonNames.length || 0) > 0);
  if (!item || !product) return null;
  const pricePaise = item.unitPricePaise + (addon ? item.addonTotalPaise : 0);
  return (
    <Modal title={`Customize ${item.name}`} onClose={onClose}>
      <p>Update this item in your current bag.</p>
      {product.variants.filter((variant) => variant.active).map((variant) => (
        <label className="radio-row" key={variant.id}>
          <input
            type="radio"
            name="cart-variation"
          checked={option === variant.name}
            onChange={() => setOption(variant.name)}
          />
          {variant.name}<span>{moneyPaise(variant.pricePaise)}</span>
        </label>
      ))}
      {item.addonNames.length > 0 && (
        <label className="radio-row">
          <input
            type="checkbox"
            checked={addon}
            onChange={(e) => setAddon(e.target.checked)}
          />
          Keep selected add-ons<span>+ {moneyPaise(item.addonTotalPaise)}</span>
        </label>
      )}
      <button
        className="btn full"
        onClick={() => {
          setState((s) => ({
            ...s,
            cart: {
              ...s.cart,
              items: s.cart.items.map((i, j) =>
                j === index
                  ? { ...i, option: option + (addon ? ` + ${item.addonNames.join(" + ")}` : ""), variantName: option, addonTotalPaise: addon ? item.addonTotalPaise : 0, lineTotalPaise: pricePaise * i.quantity }
                  : i,
              ),
            },
          }));
          toast("Your bag, just how you like it");
          onClose();
        }}
      >
        Save · {moneyPaise(pricePaise)} each
      </button>
    </Modal>
  );
}
