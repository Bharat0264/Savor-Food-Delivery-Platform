"use client";
import { useState } from "react";
import { Modal } from "./ui";
import { useDemo } from "./provider";
import { money } from "@/lib/brand";
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
  const food =
    state.merchants.find((m) => m.id === state.cart.merchantId)?.kind ===
    "food";
  const [option, setOption] = useState(
    item?.option.split(" + ")[0] || "Regular",
  );
  const [addon, setAddon] = useState(
    item?.option.includes("extra topping") || false,
  );
  if (!item || !product) return null;
  const surcharge = ["Large", "Family pack"].includes(option) ? 70 : 0;
  const price = product.price + surcharge + (addon ? 40 : 0);
  return (
    <Modal title={`Customize ${item.name}`} onClose={onClose}>
      <p>Update this item in your current bag.</p>
      {(food ? ["Regular", "Large"] : ["Standard", "Family pack"]).map((o) => (
        <label className="radio-row" key={o}>
          <input
            type="radio"
            name="cart-variation"
            checked={option === o}
            onChange={() => setOption(o)}
          />
          {o}
          <span>
            {["Large", "Family pack"].includes(o) ? "+ ₹70" : "Included"}
          </span>
        </label>
      ))}
      {food && (
        <label className="radio-row">
          <input
            type="checkbox"
            checked={addon}
            onChange={(e) => setAddon(e.target.checked)}
          />
          Extra topping<span>+ ₹40</span>
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
                  ? {
                      ...i,
                      option: option + (addon ? " + extra topping" : ""),
                      price,
                    }
                  : i,
              ),
            },
          }));
          toast("Your bag, just how you like it");
          onClose();
        }}
      >
        Save · {money(price)} each
      </button>
    </Modal>
  );
}
