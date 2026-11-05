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
import MenuBackdrop, { toneFor } from "@/components/menu/menu-backdrop";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format-price";
import { thumbnailUrl } from "@/lib/menu-image";
import type { MenuCategory, MenuItem } from "@/types/menu";

type CustomerMenuProps = {
  categories: MenuCategory[];
  items: MenuItem[];
  /** Browse only: no "+" buttons, rows don't open. Used by the public menu. */
  readOnly?: boolean;
  /** How many of this item (plain, no options) are in the order for the person ordering. */
  quickQuantity?: (item: MenuItem) => number;
  /** How many of this item are in the order in total, in any form. */
  totalQuantity?: (item: MenuItem) => number;
  onQuickAdd?: (item: MenuItem) => void;
  onQuickRemove?: (item: MenuItem) => void;
  /** Open the full item sheet (options, notes, bigger photo). */
  onOpenItem?: (item: MenuItem) => void;
  /** Extra row shown in the sticky bar, e.g. the "Ordering for" guest picker. */
  stickyExtra?: ReactNode;
};

type Section = { id: string; name: string; items: MenuItem[] };

function hasOptions(item: MenuItem) {
  return (item.sizes?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0;
}

/** The price on the leader line: the plain price, or "from ₹120" with sizes. */
function priceLabel(item: MenuItem) {
  const sizes = item.sizes ?? [];

  if (sizes.length === 0) return formatPrice(item.price);

  const lowest = Math.min(...sizes.map((size) => item.price + size.price));
  return `from ${formatPrice(lowest)}`;
}

/** "Half ₹115 · Full ₹175", shown under the name when there are sizes. */
function sizesLine(item: MenuItem) {
  const sizes = item.sizes ?? [];

  if (sizes.length === 0) return "";

  return sizes
    .map((size) => `${size.name} ${formatPrice(item.price + size.price)}`)
    .join(" · ");
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The "All" tab: every category stacked in one list. */
const ALL_ID = "__all__";

const noop = () => {};
const zero = () => 0;

export default function CustomerMenu({
  categories,
  items,
  readOnly = false,
  quickQuantity = zero,
  totalQuantity = zero,
  onQuickAdd = noop,
  onQuickRemove = noop,
  onOpenItem = noop,
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

  // "All" only makes sense when there is more than one category.
  const showAll = !searching && activeId === ALL_ID && visible.length > 1;
  const tabs = [
    ...(visible.length > 1 ? [{ id: ALL_ID, name: "All" }] : []),
    ...visible.map((section) => ({ id: section.id, name: section.name })),
  ];

  // The tone and drawing follow the category you are looking at.
  const backdropName = searching || showAll ? "" : (current?.name ?? "");
  const backdropIndex = searching || showAll ? 0 : Math.max(currentIndex, 0);
  const tone = toneFor(backdropName, backdropIndex);

  // Share the tone so the sheets that open over the menu can match it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--menu-tone", tone);
    return () => {
      root.style.removeProperty("--menu-tone");
    };
  }, [tone]);

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
    if (!start || searching || showAll) return;

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
    // Photos show only where most of a category has them, so a list never
    // looks half filled.
    const photoMode =
      list.filter((item) => item.image).length * 2 >= list.length;

    return (
      <ul>
        {list.map((item, index) => (
          <MenuRow
            key={item.id}
            item={item}
            index={index}
            photoMode={photoMode}
            readOnly={readOnly}
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
    <div className="font-menu">
      <MenuBackdrop name={backdropName} index={backdropIndex} />

      {/* Sticky: search, veg filter, guest picker and the category tabs */}
      <div
        ref={barRef}
        style={{ backgroundColor: tone }}
        className="sticky top-0 z-30 transition-colors duration-700"
      >
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu"
                aria-label="Search the menu"
                className="h-10 w-full rounded-full border border-white/12 bg-white/6 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30 [&::-webkit-search-cancel-button]:hidden"
              />

              {searching && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
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
                    ? "border-[#3fa34d] bg-[#3fa34d]/20 text-white"
                    : "border-white/12 text-white/60 hover:bg-white/8"
                }`}
              >
                <DietDot diet="veg" />
                Veg
              </button>
            )}
          </div>

          {stickyExtra && <div className="mt-4">{stickyExtra}</div>}

          {!searching && visible.length > 0 ? (
            <div
              ref={tabsRef}
              role="tablist"
              aria-label="Menu categories"
              className="relative -mx-4 mt-1 flex gap-1 overflow-x-auto px-4 scrollbar-none mask-[linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-28px),transparent)] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((section) => {
                const selected = showAll
                  ? section.id === ALL_ID
                  : section.id === current?.id;

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
                        ? "font-semibold text-ink"
                        : "text-white/45 hover:text-white/80"
                    }`}
                  >
                    {section.name}
                    <span
                      className={`absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-ink transition-transform duration-300 ${
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

        {/* A soft fade under the bar, so the list slides away instead of being cut */}
        <div
          aria-hidden="true"
          style={{
            backgroundColor: tone,
            maskImage: "linear-gradient(to bottom, #000, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
          }}
          className="pointer-events-none absolute inset-x-0 top-full h-5 transition-colors duration-700"
        />
      </div>

      {/* The list */}
      <div
        ref={panelRef}
        role="tabpanel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative z-10 mx-auto min-h-[60vh] max-w-2xl px-5 pb-32"
      >
        {visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-base text-white/75">Nothing found.</p>

            <p className="mt-2 text-sm text-white/40">
              Try another search
              {vegOnly ? ", or turn off the Veg filter" : ""}.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full border border-white/15 px-5 py-2 text-xs text-white/70 transition hover:bg-white/8"
            >
              Clear filters
            </button>
          </div>
        ) : searching ? (
          <div>
            <p className="pt-5 text-xs text-white/45">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </p>

            {visible.map((section) => (
              <section key={section.id} className="pt-6">
                <h2 className="font-menu-display text-xl">{section.name}</h2>
                {renderRows(section.items)}
              </section>
            ))}
          </div>
        ) : showAll ? (
          <div>
            <div className="animate-rise flex items-end justify-between gap-3 pb-1 pt-7">
              <h2 className="font-menu-display text-[2.1rem] leading-none sm:text-5xl">
                All
              </h2>
              <span className="shrink-0 pb-1 text-xs text-white/45">
                {resultCount} {resultCount === 1 ? "item" : "items"}
              </span>
            </div>

            {visible.map((section) => (
              <section key={section.id} className="pt-8">
                <h3 className="font-menu-display text-2xl">{section.name}</h3>
                {renderRows(section.items)}
              </section>
            ))}
          </div>
        ) : (
          current && (
            <section key={current.id}>
              <div className="animate-rise flex items-end justify-between gap-3 pb-2 pt-7">
                <h2 className="font-menu-display text-[2.1rem] leading-none sm:text-5xl">
                  {current.name}
                </h2>
                <span className="shrink-0 pb-1 text-xs text-white/45">
                  {current.items.length}{" "}
                  {current.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {renderRows(current.items)}

              {visible.length > 1 && (
                <nav
                  aria-label="Next and previous category"
                  className="flex items-center justify-between pt-9 text-sm"
                >
                  {visible[currentIndex - 1] ? (
                    <button
                      type="button"
                      onClick={() => goBy(-1)}
                      className="text-white/45 transition hover:text-white"
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
                      className="font-medium text-ink transition hover:text-white"
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
  photoMode,
  readOnly,
  quickQuantity,
  totalQuantity,
  onQuickAdd,
  onQuickRemove,
  onOpen,
}: {
  item: MenuItem;
  index: number;
  photoMode: boolean;
  readOnly: boolean;
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
  const sizes = sizesLine(item);
  const canOpen = !readOnly && available;

  const nameRow = (
    <span className="flex items-end gap-2">
      <DietDot diet={item.diet} className="mb-1.5 self-start" />
      <span className="wrap-break-word min-w-0 text-[16px] font-semibold leading-snug">
        {item.name}
      </span>
      <span
        aria-hidden="true"
        className="mb-1.25 min-w-3 flex-1 border-b-[1.5px] border-dotted border-white/25"
      />
      <span className="shrink-0 text-[15px] tabular-nums">
        {priceLabel(item)}
      </span>
    </span>
  );

  const details = (
    <>
      {item.description && (
        <span className="mt-1.5 line-clamp-2 block text-[13px] leading-5 text-white/50">
          {item.description}
        </span>
      )}

      {sizes && (
        <span className="mt-1 block text-xs text-white/45">{sizes}</span>
      )}

      {!available && (
        <span className="mt-1.5 block text-[11px] text-white/50">Sold out</span>
      )}

      {totalQuantity > 0 && (
        <span className="mt-1.5 block text-[11px] font-medium text-ink">
          {totalQuantity} in your order
        </span>
      )}
    </>
  );

  return (
    <li
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
      className={`animate-rise flex items-center gap-3.5 border-b border-white/8 py-4 last:border-b-0 ${
        available ? "" : "opacity-50"
      }`}
    >
      {photoMode && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/6">
          {showImage && (
            <Image
              key={imageSrc}
              src={imageSrc}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              unoptimized
              onError={() =>
                setImageStage((stage) =>
                  stage === 0 && imageSrc !== item.image ? 1 : 2,
                )
              }
              className="h-14 w-14 object-cover"
            />
          )}
        </div>
      )}

      {canOpen ? (
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="min-w-0 flex-1 text-left"
        >
          {nameRow}
          {details}
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          {nameRow}
          {details}
        </div>
      )}

      {!readOnly && available && (
        <div className="shrink-0">
          {hasOptions(item) ? (
            <button
              type="button"
              onClick={() => onOpen(item)}
              aria-label={`Choose options for ${item.name}`}
              className="h-9 rounded-full border border-ink/45 px-4 text-xs font-medium text-ink transition hover:bg-white/10 active:scale-95"
            >
              Choose
            </button>
          ) : quickQuantity > 0 ? (
            <div
              role="group"
              aria-label={`${item.name} quantity`}
              className="flex h-9 items-center rounded-full bg-ink text-ink-dark"
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
                className="animate-pop min-w-5 text-center text-sm font-semibold tabular-nums"
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-ink-dark transition hover:bg-white active:scale-90"
            >
              <Plus size={17} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
