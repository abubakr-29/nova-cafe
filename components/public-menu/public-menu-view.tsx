"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { formatPrice } from "@/lib/format-price";
import type { PublicMenuCategory } from "@/lib/public-menu";

type PublicMenuViewProps = {
  restaurantName: string;
  categories: PublicMenuCategory[];
};

export default function PublicMenuView({
  restaurantName,
  categories,
}: PublicMenuViewProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const chipBarRef = useRef<HTMLDivElement>(null);

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  const visibleCategories = useMemo(() => {
    if (!searching) return categories;

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.name.toLowerCase().includes(needle),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, needle, searching]);

  // Scroll-spy: highlight the category whose heading is nearest the top.
  useEffect(() => {
    if (searching) return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-menu-section]"),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.filter((entry) => entry.isIntersecting);
        if (inView.length === 0) return;

        inView.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        );

        const id = inView[0].target.getAttribute("data-menu-section");
        if (id) setActiveId(id);
      },
      // A band just under the sticky bar.
      { rootMargin: "-140px 0px -65% 0px" },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [searching, categories]);

  // Keep the active chip centred in the horizontally scrolling bar.
  useEffect(() => {
    const bar = chipBarRef.current;
    if (!bar) return;

    const chip = Array.from(bar.children).find(
      (el) => el.getAttribute("data-chip") === activeId,
    ) as HTMLElement | undefined;
    if (!chip) return;

    bar.scrollTo({
      left: chip.offsetLeft - (bar.clientWidth - chip.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [activeId]);

  function jumpTo(id: string) {
    setActiveId(id);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.getElementById(`menu-${id}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <header className="mx-auto max-w-2xl px-5 pb-5 pt-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Menu
        </p>

        <h1 className="mt-2 wrap-break-word text-3xl font-medium tracking-tight">
          {restaurantName}
        </h1>
      </header>

      {categories.length === 0 ? (
        <p className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-white/40">
          This menu hasn&apos;t been set up yet.
        </p>
      ) : (
        <>
          {/* Sticky search + category bar */}
          <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0b0b0d]/95 backdrop-blur-md">
            <div className="mx-auto max-w-2xl px-5 pt-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the menu"
                  aria-label="Search the menu"
                  className="h-10 w-full rounded-full border border-white/10 bg-white/3 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 [&::-webkit-search-cancel-button]:hidden"
                />

                {searching && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {!searching && (
                <nav aria-label="Menu categories">
                  <div
                    ref={chipBarRef}
                    className="relative -mx-5 flex gap-2 overflow-x-auto px-5 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden"
                  >
                    {categories.map((category) => {
                      const active = category.id === activeId;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          data-chip={category.id}
                          onClick={() => jumpTo(category.id)}
                          aria-current={active ? "true" : undefined}
                          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs transition ${
                            active
                              ? "border-[#f5f2ea] bg-[#f5f2ea] font-medium text-[#0b0b0d]"
                              : "border-white/10 text-white/55 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              )}

              {searching && <div className="h-3" />}
            </div>
          </div>

          {/* Items */}
          <div className="mx-auto max-w-2xl px-5 pb-16">
            {searching && visibleCategories.length === 0 ? (
              <p className="py-16 text-center text-sm text-white/40">
                Nothing on the menu matches &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              visibleCategories.map((category) => (
                <section
                  key={category.id}
                  id={`menu-${category.id}`}
                  data-menu-section={category.id}
                  className="scroll-mt-32 pt-8"
                >
                  <h2 className="text-[11px] uppercase tracking-[0.25em] text-[#d7a45a]">
                    {category.name}
                  </h2>

                  <ul className="mt-2 divide-y divide-white/6">
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-start justify-between gap-4 py-3.5 ${
                          item.available ? "" : "opacity-45"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="wrap-break-word text-[15px]">
                            {item.name}
                          </p>

                          {!item.available && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">
                              Sold out
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right text-sm tabular-nums">
                          {item.sizes.length > 0 ? (
                            item.sizes.map((size, index) => (
                              <p
                                key={`${size.name}-${index}`}
                                className="flex justify-end gap-3"
                              >
                                <span className="text-white/40">
                                  {size.name}
                                </span>
                                <span>{formatPrice(size.price)}</span>
                              </p>
                            ))
                          ) : (
                            <p>{formatPrice(item.price)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            <p className="mt-14 text-center text-xs text-white/25">
              To order, scan the QR code on your table.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
