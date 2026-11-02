"use client";

import Image from "next/image";
import { Minus, Plus, Search, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
} from "react";

import DietDot from "@/components/menu/diet-dot";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format-price";
import { thumbnailUrl } from "@/lib/menu-image";
import type { MenuCategory, MenuItem } from "@/types/menu";

type CustomerMenuProps = {
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

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CustomerMenu({
  categories,
  items,
  quickQuantity,
  totalQuantity,
  onQuickAdd,
  onQuickRemove,
  onOpenItem,
  stickyExtra,
}: CustomerMenuProps) {
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeId, setActiveId] = useState("");

  const barRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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

  // What the filters leave: used for the tabs and for search results.
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

  const current =
    visible.find((section) => section.id === activeId) ?? visible[0];
  const currentIndex = current
    ? visible.findIndex((section) => section.id === current.id)
    : -1;
  const resultCount = visible.reduce(
    (count, section) => count + section.items.length,
    0,
  );

  // Keep the selected tab centred in the sliding tab bar.
  const currentId = current?.id;
  useEffect(() => {
    const bar = tabsRef.current;
    if (!bar || !currentId) return;

    const tab = bar.querySelector<HTMLElement>(`[data-tab="${currentId}"]`);
    if (!tab) return;

    bar.scrollTo({
      left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [currentId]);

  function selectTab(id: string) {
    setActiveId(id);

    // If the page is scrolled down, bring the new list back into view.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      const bar = barRef.current;
      if (!panel || !bar) return;

      const barBottom = bar.getBoundingClientRect().bottom;
      const top = panel.getBoundingClientRect().top;

      if (top < barBottom) {
        window.scrollBy({
          top: top - barBottom - 8,
          behavior: reducedMotion() ? "auto" : "smooth",
        });
      }
    });
  }

  function goBy(step: -1 | 1) {
    const next = visible[currentIndex + step];
    if (next) selectTab(next.id);
  }

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  // A clear sideways swipe moves to the next or previous category.
  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || searching) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
      goBy(dx < 0 ? 1 : -1);
    }
  }

  function clearFilters() {
    setQuery("");
    setVegOnly(false);
  }

  function renderRows(list: MenuItem[]) {
    return (
      <ul>
        {list.map((item, index) => (
          <MenuRow
            key={item.id}
            item={item}
            index={index}
            quickQuantity={quickQuantity(item)}
            totalQuantity={totalQuantity(item)}
            onQuickAdd={onQuickAdd}
            onQuickRemove={onQuickRemove}
            onOpen={onOpenItem}
          />
        ))}
      </ul>
    );
  }

  return (
    <div>
      {/* Sticky: search, veg filter, guest picker and the category tabs */}
      <div
        ref={barRef}
        className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0b0b0d]/90 backdrop-blur-xl"
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
            <div
              ref={tabsRef}
              role="tablist"
              aria-label="Menu categories"
              className="relative -mx-4 mt-1 flex gap-1 overflow-x-auto px-4 scrollbar-none mask-[linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-28px),transparent)] [&::-webkit-scrollbar]:hidden"
            >
              {visible.map((section) => {
                const selected = section.id === current?.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    data-tab={section.id}
                    aria-selected={selected}
                    onClick={() => selectTab(section.id)}
                    className={`relative shrink-0 px-3 py-3 text-sm transition-colors ${
                      selected
                        ? "font-medium text-[#f5f2ea]"
                        : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    {section.name}
                    <span
                      className={`absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-[#d7a45a] transition-transform duration-300 ${
                        selected ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-3" />
          )}
        </div>
      </div>

      {/* The list */}
      <div
        ref={panelRef}
        role="tabpanel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mx-auto min-h-[60vh] max-w-2xl px-5 pb-32"
      >
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
        ) : searching ? (
          <div>
            <p className="pt-5 text-xs text-white/35">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </p>

            {visible.map((section) => (
              <section key={section.id} className="pt-5">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-[#d7a45a]">
                  {section.name}
                </h2>
                {renderRows(section.items)}
              </section>
            ))}
          </div>
        ) : (
          current && (
            <section key={current.id}>
              <div className="animate-rise flex items-baseline justify-between gap-3 pb-1 pt-6">
                <h2 className="text-2xl font-medium tracking-tight">
                  {current.name}
                </h2>
                <span className="text-xs text-white/30">
                  {current.items.length}{" "}
                  {current.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {renderRows(current.items)}

              {visible.length > 1 && (
                <nav
                  aria-label="Next and previous category"
                  className="flex items-center justify-between pt-8 text-sm"
                >
                  {visible[currentIndex - 1] ? (
                    <button
                      type="button"
                      onClick={() => goBy(-1)}
                      className="text-white/40 transition hover:text-white"
                    >
                      ← {visible[currentIndex - 1].name}
                    </button>
                  ) : (
                    <span />
                  )}

                  {visible[currentIndex + 1] ? (
                    <button
                      type="button"
                      onClick={() => goBy(1)}
                      className="text-white/70 transition hover:text-white"
                    >
                      {visible[currentIndex + 1].name} →
                    </button>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </section>
          )
        )}
      </div>
    </div>
  );
}

function MenuRow({
  item,
  index,
  quickQuantity,
  totalQuantity,
  onQuickAdd,
  onQuickRemove,
  onOpen,
}: {
  item: MenuItem;
  index: number;
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
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
      className={`animate-rise flex items-start gap-4 border-b border-white/6 py-5 last:border-b-0 ${
        available ? "" : "opacity-45"
      }`}
    >
      <button
        type="button"
        disabled={!available}
        onClick={() => onOpen(item)}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className="flex items-start gap-2">
          <DietDot diet={item.diet} className="mt-0.75" />
          <span className="wrap-break-word text-[15px] font-medium leading-snug">
            {item.name}
          </span>
        </span>

        {item.description && (
          <span className="mt-1.5 line-clamp-2 block text-[13px] leading-5 text-white/40">
            {item.description}
          </span>
        )}

        <span className="mt-2 block text-sm tabular-nums text-white/80">
          {priceLabel(item)}
        </span>

        {!available && (
          <span className="mt-1.5 block text-[10px] uppercase tracking-wider text-white/40">
            Sold out
          </span>
        )}

        {totalQuantity > 0 && (
          <span className="mt-1.5 block text-[11px] text-[#d7a45a]">
            {totalQuantity} in your order
          </span>
        )}
      </button>

      <div className="flex w-24 shrink-0 flex-col items-end gap-2.5">
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
              className="h-9 rounded-full border border-[#f5f2ea]/35 px-5 text-xs font-medium text-[#f5f2ea] transition active:scale-95 hover:bg-white/8"
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
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10 active:scale-90"
              >
                <Minus size={15} />
              </button>

              <span
                key={quickQuantity}
                className="animate-pop min-w-5 text-center text-sm font-medium tabular-nums"
              >
                {quickQuantity}
              </span>

              <button
                type="button"
                onClick={() => onQuickAdd(item)}
                disabled={quickQuantity >= MAX_ITEM_QUANTITY}
                aria-label={`Add one more ${item.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onQuickAdd(item)}
              aria-label={`Add ${item.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f5f2ea]/35 text-[#f5f2ea] transition hover:bg-white/8 active:scale-90"
            >
              <Plus size={16} />
            </button>
          ))}
      </div>
    </li>
  );
}
