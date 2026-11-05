"use client";

import { Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import DietDot from "@/components/menu/diet-dot";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem, MenuOption } from "@/types/menu";
import type { CartItem } from "@/types/cart";
import type { TableGuest } from "@/types/session";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";

type MenuItemSheetProps = {
  item: MenuItem | null;
  guests: TableGuest[];
  /** Which guest (1-based) is preselected under "Who's this for?". */
  defaultGuestIndex?: number;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  /** "guest" = dark strata look for customers. Staff keeps the default. */
  variant?: "staff" | "guest";
};

export default function MenuItemSheet({
  item,
  guests,
  defaultGuestIndex,
  onClose,
  onAdd,
  variant = "staff",
}: MenuItemSheetProps) {
  const g = variant === "guest";
  const [selectedSize, setSelectedSize] = useState<MenuOption | undefined>(
    item?.sizes?.[0],
  );

  const [selectedAddons, setSelectedAddons] = useState<MenuOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selectedGuestIndex, setSelectedGuestIndex] = useState<
    number | undefined
  >(
    guests.length > 0
      ? Math.min(Math.max(defaultGuestIndex ?? 1, 1), guests.length)
      : undefined,
  );

  useEffect(() => {
    if (!item) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [item]);

  const totalPrice = useMemo(() => {
    if (!item) return 0;

    const sizePrice = selectedSize?.price ?? 0;

    const addonPrice = selectedAddons.reduce(
      (total, addon) => total + addon.price,
      0,
    );

    return (item.price + sizePrice + addonPrice) * quantity;
  }, [item, selectedSize, selectedAddons, quantity]);

  if (!item) {
    return null;
  }

  const currentItem = item;

  // With sizes, the header shows the lowest price ("from ₹250").
  const sizeExtras = currentItem.sizes?.map((size) => size.price) ?? [];
  const startingPrice =
    currentItem.price + (sizeExtras.length > 0 ? Math.min(...sizeExtras) : 0);
  const hasPriceRange = new Set(sizeExtras).size > 1;

  function toggleAddon(addon: MenuOption) {
    setSelectedAddons((current) => {
      const exists = current.some((item) => item.id === addon.id);

      if (exists) {
        return current.filter((item) => item.id !== addon.id);
      }

      return [...current, addon];
    });
  }

  function handleAdd() {
    onAdd({
      cartItemId: crypto.randomUUID(),
      menuItemId: currentItem.id,
      name: currentItem.name,
      basePrice: currentItem.price,
      quantity,
      size: selectedSize,
      addons: selectedAddons,
      note: note.trim() || undefined,
      image: currentItem.image,
      guestIndex: selectedGuestIndex,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      {/* Backdrop */}
      <button
        aria-label="Close item details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      {/* Sheet */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${currentItem.name} details`}
        className={
          g
            ? "font-menu animate-sheet relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl border border-ink/10 guest-surface shadow-2xl"
            : "animate-sheet relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl border border-white/10 bg-[#151519] shadow-2xl"
        }
      >
        {/* Close */}
        <div className="sticky top-5 z-20 h-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className={
              g
                ? "absolute right-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-ink/70 backdrop-blur-md transition hover:bg-black/70 hover:text-ink"
                : "absolute right-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-black/70 hover:text-white"
            }
          >
            <X size={18} />
          </button>
        </div>

        {/* Image (many items have no photo) */}
        {currentItem.image && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={currentItem.image}
              alt={currentItem.name}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              unoptimized
              className="object-cover"
            />

            <div
              className={
                g
                  ? "absolute inset-0 bg-linear-to-t from-[color-mix(in_srgb,var(--menu-tone,#161618)_94%,#ece9e1_6%)] via-transparent to-transparent"
                  : "absolute inset-0 bg-linear-to-t from-[#151519] via-transparent to-transparent"
              }
            />
          </div>
        )}

        {/* Content */}
        <div
          className={`px-6 pb-7 md:px-8 ${currentItem.image ? "pt-2" : "pt-8"}`}
        >
          <div>
            <p
              className={
                g
                  ? "flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-ink"
                  : "flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#d7a45a]"
              }
            >
              <DietDot diet={currentItem.diet} />
              {currentItem.category}
            </p>

            <div className="mt-2 flex items-start justify-between gap-6">
              <div>
                <h2 className="text-3xl font-medium tracking-[-0.03em]">
                  {currentItem.name}
                </h2>

                {currentItem.description && (
                  <p
                    className={
                      g
                        ? "mt-3 max-w-lg text-sm leading-6 text-ink/45"
                        : "mt-3 max-w-lg text-sm leading-6 text-white/45"
                    }
                  >
                    {currentItem.description}
                  </p>
                )}
              </div>

              <p className="shrink-0 text-lg font-medium">
                {hasPriceRange && "from "}
                {formatPrice(startingPrice)}
              </p>
            </div>
          </div>

          {/* Sizes */}
          {currentItem.sizes && currentItem.sizes.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Size</h3>

                <span
                  className={
                    g ? "text-xs text-ink/30" : "text-xs text-white/30"
                  }
                >
                  Choose one
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {currentItem.sizes.map((size) => {
                  const selected = selectedSize?.id === size.id;

                  return (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-sm transition ${
                        selected
                          ? g
                            ? "border-ink bg-ink text-ink-dark"
                            : "border-[#f5f2ea] bg-[#f5f2ea] text-[#0b0b0d]"
                          : g
                            ? "border-ink/10 bg-ink/2.5 text-ink/60 hover:border-ink/20"
                            : "border-white/10 bg-white/2.5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <span>{size.name}</span>

                      <span>{formatPrice(currentItem.price + size.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Addons */}
          {currentItem.addons && currentItem.addons.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium">Extras</h3>

              <div className="space-y-2">
                {currentItem.addons.map((addon) => {
                  const selected = selectedAddons.some(
                    (item) => item.id === addon.id,
                  );

                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-sm transition ${
                        selected
                          ? g
                            ? "border-ink/60 bg-ink/10"
                            : "border-[#d7a45a]/60 bg-[#d7a45a]/10"
                          : g
                            ? "border-ink/10 bg-ink/2.5 text-ink/60 hover:border-ink/20"
                            : "border-white/10 bg-white/2.5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            selected
                              ? g
                                ? "border-ink bg-ink text-ink-dark"
                                : "border-[#d7a45a] bg-[#d7a45a] text-[#0b0b0d]"
                              : g
                                ? "border-ink/20"
                                : "border-white/20"
                          }`}
                        >
                          {selected && "✓"}
                        </span>

                        <span>{addon.name}</span>
                      </div>

                      <span>+₹{addon.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guest */}
          {guests.length > 1 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium">Who&apos;s this for?</h3>

              <div className="flex flex-wrap gap-2">
                {guests.map((guest, index) => {
                  const guestIndex = index + 1;
                  const selected = selectedGuestIndex === guestIndex;

                  return (
                    <button
                      key={guest.id}
                      onClick={() => setSelectedGuestIndex(guestIndex)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        selected
                          ? g
                            ? "border-ink/60 bg-ink/10 text-ink"
                            : "border-[#d7a45a]/60 bg-[#d7a45a]/10 text-[#d7a45a]"
                          : g
                            ? "border-ink/10 bg-ink/2.5 text-ink/60 hover:border-ink/20"
                            : "border-white/10 bg-white/2.5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      {guest.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-medium">Special instructions</h3>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Less sweet, no onions, extra crispy..."
              rows={3}
              maxLength={200}
              className={
                g
                  ? "w-full resize-none rounded-2xl border border-ink/10 bg-ink/2.5 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/20 focus:border-ink/20"
                  : "w-full resize-none rounded-2xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20"
              }
            />

            <p
              className={
                g
                  ? "mt-2 text-right text-xs text-ink/20"
                  : "mt-2 text-right text-xs text-white/20"
              }
            >
              {note.length}/200
            </p>
          </div>

          {/* Quantity + Add */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div
              className={
                g
                  ? "flex h-14 w-full items-center justify-between rounded-full border border-ink/10 px-2 sm:w-36"
                  : "flex h-14 w-full items-center justify-between rounded-full border border-white/10 px-2 sm:w-36"
              }
            >
              <button
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                className={
                  g
                    ? "flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-ink/5 hover:text-ink"
                    : "flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white"
                }
              >
                <Minus size={16} />
              </button>

              <span className="text-sm font-medium">{quantity}</span>

              <button
                onClick={() =>
                  setQuantity((current) =>
                    Math.min(MAX_ITEM_QUANTITY, current + 1),
                  )
                }
                disabled={quantity >= MAX_ITEM_QUANTITY}
                className={
                  g
                    ? "flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-ink/5 hover:text-ink disabled:cursor-default disabled:text-ink/15 disabled:hover:bg-transparent"
                    : "flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-default disabled:text-white/15 disabled:hover:bg-transparent"
                }
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={
                g
                  ? "flex h-14 w-full items-center justify-between rounded-full bg-ink px-6 text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99] sm:flex-1"
                  : "flex h-14 w-full items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] sm:flex-1"
              }
            >
              <span>Add to order</span>

              <span>₹{totalPrice}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
