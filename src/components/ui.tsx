"use client";
import { useEffect, useRef, ReactNode } from "react";
import { X, ArrowUpRight, Star, Heart } from "lucide-react";
import Link from "next/link";
import { Merchant } from "@/lib/model";
import { useDemo } from "./provider";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MerchantCard({ merchant: m }: { merchant: Merchant }) {
  const { state, setState } = useDemo();
  return (
    <article className="merchant-card">
      <Link href={`/store/${m.id}`}>
        <div className="card-image">
          <img src={m.image} alt={`${m.name} ${m.category}`} loading="lazy" />
          <span className="image-pill">
            {m.id === "m1"
              ? "NEIGHBOURHOOD FAVOURITE"
              : m.kind === "grocery"
                ? "FRESH EVERY DAY"
                : "CURATED FOR YOU"}
          </span>
        </div>
      </Link>
      <button
        className={`favorite ${state.favorites.includes(m.id) ? "active" : ""}`}
        aria-label={`Favorite ${m.name}`}
        onClick={() =>
          setState((s) => ({
            ...s,
            favorites: s.favorites.includes(m.id)
              ? s.favorites.filter((id) => id !== m.id)
              : [...s.favorites, m.id],
          }))
        }
      >
        <Heart
          size={17}
          fill={state.favorites.includes(m.id) ? "currentColor" : "none"}
        />
      </button>
      <div className="card-title">
        <Link href={`/store/${m.id}`}>
          <h3>{m.name}</h3>
        </Link>
        <span>
          <Star size={13} fill="currentColor" /> {m.rating}
        </span>
      </div>
      <p>{m.category}</p>
      <div className="card-meta">
        <span>
          {m.eta} <b>·</b> 1.2 km away
        </span>
        <ArrowUpRight size={19} />
      </div>
    </article>
  );
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">✳</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && (
        <Link className="btn" href={href}>
          {label || "Explore the neighbourhood"} <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
