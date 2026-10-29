"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useDemo } from "./provider";
import { MerchantCard, Empty } from "./ui";
export function Discovery({ kind }: { kind: "food" | "grocery" }) {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Recommended");
  const categories =
    kind === "food"
      ? ["All", "Healthy", "Italian", "Plant-based", "Indian"]
      : ["All", "Farm fresh", "Organic"];
  const list = state.merchants
    .filter(
      (m) =>
        m.approved &&
        m.kind === kind &&
        `${m.name} ${m.category}`.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "All" || m.category.includes(filter)),
    )
    .sort((a, b) =>
      sort === "Top rated"
        ? b.rating - a.rating
        : sort === "Fastest delivery"
          ? parseInt(a.eta) - parseInt(b.eta)
          : 0,
    );
  return (
    <div className={`discovery ${kind}`}>
      <section className="discovery-hero">
        <div className="eyebrow">
          {kind === "food"
            ? "GOOD TASTE STARTS CLOSE TO HOME"
            : "A FRESHER KIND OF EVERYDAY"}
        </div>
        <h1>
          {kind === "food" ? (
            <>
              Follow your <em>cravings.</em>
            </>
          ) : (
            <>
              Fresh finds.
              <br />
              <em>Everyday joy.</em>
            </>
          )}
        </h1>
        <p>
          {kind === "food"
            ? "Exceptional local kitchens. Something for every kind of hungry."
            : "Your favourite neighbourhood stores, brought a little closer."}
        </p>
        <div className="searchbox">
          <Search size={20} />
          <input
            aria-label="Search merchants"
            placeholder={
              kind === "food"
                ? "Search restaurants, cuisines, your next favourite…"
                : "Search grocery stores…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>
      <section className="section">
        <div className="filter-row">
          <div className="chips">
            {categories.map((c) => (
              <button
                className={filter === c ? "chip active" : "chip"}
                key={c}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            aria-label="Sort merchants"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Recommended</option>
            <option>Top rated</option>
            <option>Fastest delivery</option>
          </select>
        </div>
        <div className="section-heading">
          <h2>
            {kind === "food"
              ? "Your local love list."
              : "Fresh around the corner."}
          </h2>
          <span>{list.length} places to love</span>
        </div>
        <div className="merchant-grid">
          {list.map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
        {!list.length && (
          <Empty
            title="No matches just yet"
            description="Try a different cuisine or store name."
          />
        )}
      </section>
    </div>
  );
}
