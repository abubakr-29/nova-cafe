"use client";

import Image from "next/image";
import { List, Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import DietDot from "@/components/menu/diet-dot";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format-price";
import { thumbnailUrl } from "@/lib/menu-image";
import type { MenuCategory, MenuItem } from "@/types/menu";

type MenuBrowserProps = {
  categories: MenuCategory[];
  items: MenuItem[];
  /** How many of this item (plain, no options) are in the order for the person ordering. */
  quickQuantity: (item: MenuItem) => number;
  /** How many of this item are in the order in total, in any form. */
  totalQuantity: (item: MenuItem) => number;
  onQuickAdd: (item: MenuItem) => void;
  onQuickRemove: (item: MenuItem) => void;
  /** Open the full item sheet (options, notes, bigger photo). */
  onOpenItem: (item: MenuItem) => void;
  /** Extra row shown in the sticky bar, e.g. the "Ordering for" guest picker. */
  stickyExtra?: ReactNode;
  /** Where the sticky bar sticks. Defaults to the top of the screen. */
  stickyClassName?: string;
};

type Section = { id: string; name: string; items: MenuItem[] };

function hasOptions(item: MenuItem) {
  return (item.sizes?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0;
}

/** "₹200", "Half ₹250 · Full ₹350", or "from ₹120" when there are many sizes. */
function priceLabel(item: MenuItem) {
  const sizes = item.sizes ?? [];

  if (sizes.length === 0) return formatPrice(item.price);

  const totals = sizes.map((size) => item.price + size.price);

  if (sizes.length <= 3) {
    return sizes
      .map((size, i) => `${size.name} ${formatPrice(totals[i])}`)
      .join(" · ");
  }

  return `from ${formatPrice(Math.min(...totals))}`;
}

export default function MenuBrowser({
  categories,
  items,
  quickQuantity,
  totalQuantity,
  onQuickAdd,
  onQuickRemove,
  onOpenItem,
  stickyExtra,
  stickyClassName = "top-0",
}: MenuBrowserProps) {
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const chipBarRef = useRef<HTMLDivElement>(null);

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;
  const hasDiet = items.some((item) => item.diet);

  // Categories in the owner's order, with their items.
  const sections = useMemo<Section[]>(() => {
    const byCategory = new Map<string, MenuItem[]>();

    for (const item of items) {
      const list = byCategory.get(item.categoryId) ?? [];
      list.push(item);
      byCategory.set(item.categoryId, list);
    }

    const result: Section[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: byCategory.get(category.id) ?? [],
    }));

    // Items whose category was deleted still belong on the menu.
    const known = new Set(categories.map((category) => category.id));
    const orphans = items.filter((item) => !known.has(item.categoryId));

    if (orphans.length > 0) {
      result.push({ id: "other", name: "Other", items: orphans });
    }

    return result;
  }, [categories, items]);

  const visible = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              (!vegOnly || item.diet === "veg") &&
              (!needle ||
                item.name.toLowerCase().includes(needle) ||
                item.description.toLowerCase().includes(needle)),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [sections, vegOnly, needle],
  );

  const visibleKey = visible.map((section) => section.id).join("|");

  const highlightId = visible.some((section) => section.id === activeId)
    ? activeId
    : (visible[0]?.id ?? "");

  // Scroll-spy: highlight the category whose heading is nearest the top.
  useEffect(() => {
    if (searching) return;

    const headings = Array.from(
      document.querySelectorAll<HTMLElement>("[data-menu-section]"),
    );
    if (headings.length === 0) return;

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
      { rootMargin: "-170px 0px -65% 0px" },
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [searching, visibleKey]);

  // Keep the highlighted chip centred in the horizontally scrolling bar.
  useEffect(() => {
    const bar = chipBarRef.current;
    if (!bar) return;

    const chip = Array.from(bar.children).find(
      (el) => el.getAttribute("data-chip") === highlightId,
    ) as HTMLElement | undefined;
    if (!chip) return;

    bar.scrollTo({
      left: chip.offsetLeft - (bar.clientWidth - chip.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [highlightId]);

  // Lock the page behind the category list while it's open.
  useEffect(() => {
    if (!indexOpen) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [indexOpen]);

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

  function clearFilters() {
    setQuery("");
    setVegOnly(false);
  }

  return (
    <div>
      {/* Sticky search + filters + categories */}
      <div
        className={`sticky ${stickyClassName} z-30 border-b border-white/[0.07] bg-[#0b0b0d]/95 backdrop-blur-md`}
      >
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
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

            {hasDiet && (
              <button
                type="button"
                onClick={() => setVegOnly((value) => !value)}
                aria-pressed={vegOnly}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs transition ${
                  vegOnly
                    ? "border-[#3fa34d] bg-[#3fa34d]/15 text-white"
                    : "border-white/10 text-white/55 hover:bg-white/5"
                }`}
              >
                <DietDot diet="veg" />
                Veg
              </button>
            )}
          </div>

          {stickyExtra && <div className="mt-2">{stickyExtra}</div>}

          {!searching && visible.length > 0 ? (
            <nav
              aria-label="Menu categories"
              className="flex items-center gap-2 py-3"
            >
              <button
                type="button"
                onClick={() => setIndexOpen(true)}
                aria-label="Open the category list"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/5"
              >
                <List size={14} />
                Menu
              </button>

              <div
                ref={chipBarRef}
                className="relative -mr-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4 scrollbar-none [&::-webkit-scrollbar]:hidden"
              >
                {visible.map((section) => {
                  const active = section.id === highlightId;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      data-chip={section.id}
                      onClick={() => jumpTo(section.id)}
                      aria-current={active ? "true" : undefined}
                      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs transition ${
                        active
                          ? "border-[#f5f2ea] bg-[#f5f2ea] font-medium text-[#0b0b0d]"
                          : "border-white/10 text-white/55 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {section.name}
                    </button>
                  );
                })}
              </div>
            </nav>
          ) : (
            <div className="h-3" />
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mx-auto max-w-2xl px-4 pb-32">
        {vegOnly && (
          <p className="pt-3 text-[11px] text-white/35">
            Showing only items marked vegetarian.
          </p>
        )}

        {visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-base text-white/70">Nothing found.</p>

            <p className="mt-2 text-sm text-white/30">
              Try another search
              {vegOnly ? ", or turn off the Veg filter" : ""}.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full border border-white/10 px-5 py-2 text-xs text-white/60 transition hover:bg-white/5"
            >
              Clear filters
            </button>
          </div>
        ) : (
          visible.map((section) => (
            <section
              key={section.id}
              id={`menu-${section.id}`}
              data-menu-section={section.id}
              className="scroll-mt-44 pt-7"
            >
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-[#d7a45a]">
                {section.name}
              </h2>

              <ul className="mt-1 divide-y divide-white/6">
                {section.items.map((item) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    quickQuantity={quickQuantity(item)}
                    totalQuantity={totalQuantity(item)}
                    onQuickAdd={onQuickAdd}
                    onQuickRemove={onQuickRemove}
                    onOpen={onOpenItem}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Category list */}
      {indexOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu categories"
          className="fixed inset-0 z-90 flex items-end justify-center"
        >
          <button
            type="button"
            aria-label="Close the category list"
            onClick={() => setIndexOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div className="animate-sheet relative max-h-[75vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#151519] p-5 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Jump to</h2>

              <button
                type="button"
                onClick={() => setIndexOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/8 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <ul>
              {visible.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIndexOpen(false);
                      jumpTo(section.id);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white/80 transition hover:bg-white/5"
                  >
                    <span>{section.name}</span>
                    <span className="text-xs text-white/35">
                      {section.items.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  item,
  quickQuantity,
  totalQuantity,
  onQuickAdd,
  onQuickRemove,
  onOpen,
}: {
  item: MenuItem;
  quickQuantity: number;
  totalQuantity: number;
  onQuickAdd: (item: MenuItem) => void;
  onQuickRemove: (item: MenuItem) => void;
  onOpen: (item: MenuItem) => void;
}) {
  // 0 = the small thumbnail, 1 = the full photo (older uploads have no
  // thumbnail), 2 = give up quietly (no broken-image icon).
  const [imageStage, setImageStage] = useState(0);

  const available = item.available !== false;
  const showImage = !!item.image && imageStage < 2;
  const imageSrc = imageStage === 0 ? thumbnailUrl(item.image) : item.image;

  return (
    <li
      className={`flex items-start gap-3 py-4 ${available ? "" : "opacity-45"}`}
    >
      <button
        type="button"
        disabled={!available}
        onClick={() => onOpen(item)}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className="flex items-start gap-2">
          <DietDot diet={item.diet} className="mt-0.75" />
          <span className="wrap-break-word text-[15px] leading-snug">
            {item.name}
          </span>
        </span>

        <span className="mt-1 block text-sm tabular-nums text-white/70">
          {priceLabel(item)}
        </span>

        {item.description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/35">
            {item.description}
          </span>
        )}

        {!available && (
          <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/40">
            Sold out
          </span>
        )}

        {totalQuantity > 0 && (
          <span className="mt-1.5 block text-[11px] text-[#d7a45a]">
            {totalQuantity} in your order
          </span>
        )}
      </button>

      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        {showImage && (
          <button
            type="button"
            disabled={!available}
            onClick={() => onOpen(item)}
            aria-label={`View ${item.name}`}
            className="block disabled:cursor-default"
          >
            <Image
              key={imageSrc}
              src={imageSrc}
              alt=""
              width={84}
              height={84}
              sizes="84px"
              unoptimized
              onError={() =>
                setImageStage((stage) =>
                  stage === 0 && imageSrc !== item.image ? 1 : 2,
                )
              }
              className="h-21 w-21 rounded-2xl object-cover"
            />
          </button>
        )}

        {available &&
          (hasOptions(item) ? (
            <button
              type="button"
              onClick={() => onOpen(item)}
              aria-label={`Choose options for ${item.name}`}
              className="h-9 rounded-full border border-[#f5f2ea]/40 px-5 text-xs font-medium text-[#f5f2ea] transition hover:bg-white/8"
            >
              Choose
            </button>
          ) : quickQuantity > 0 ? (
            <div
              role="group"
              aria-label={`${item.name} quantity`}
              className="flex h-9 items-center rounded-full bg-[#f5f2ea] text-[#0b0b0d]"
            >
              <button
                type="button"
                onClick={() => onQuickRemove(item)}
                aria-label={`Remove one ${item.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10"
              >
                <Minus size={15} />
              </button>

              <span className="min-w-5 text-center text-sm font-medium tabular-nums">
                {quickQuantity}
              </span>

              <button
                type="button"
                onClick={() => onQuickAdd(item)}
                disabled={quickQuantity >= MAX_ITEM_QUANTITY}
                aria-label={`Add one more ${item.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onQuickAdd(item)}
              aria-label={`Add ${item.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f5f2ea]/40 text-[#f5f2ea] transition hover:bg-white/8"
            >
              <Plus size={16} />
            </button>
          ))}
      </div>
    </li>
  );
}
