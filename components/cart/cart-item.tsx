"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { thumbnailUrl } from "@/lib/menu-image";
import type { CartItem as CartItemType } from "@/types/cart";
import {
  getCartItemDetails,
  getCartItemUnitPrice,
  MAX_ITEM_QUANTITY,
} from "@/lib/cart";

type CartItemProps = {
  item: CartItemType;
  guestName?: string;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  variant?: "staff" | "guest";
};

export default function CartItem({
  item,
  guestName,
  onQuantityChange,
  onRemove,
  variant = "staff",
}: CartItemProps) {
  const g = variant === "guest";
  const unitPrice = getCartItemUnitPrice(item);
  const totalPrice = unitPrice * item.quantity;
  const details = getCartItemDetails(item);

  return (
    <article
      className={
        g
          ? "border-b border-ink/8 py-5 last:border-b-0"
          : "border-b border-white/8 py-5 last:border-b-0"
      }
    >
      <div className="flex gap-4">
        {/* Image */}
        <div
          className={
            g
              ? "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-ink/4"
              : "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/4"
          }
        >
          {item.image && (
            <Image
              src={thumbnailUrl(item.image)}
              alt={item.name}
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                className={
                  g
                    ? "truncate text-sm font-medium text-ink"
                    : "truncate text-sm font-medium text-white"
                }
              >
                {item.name}
              </h3>

              {details && (
                <p
                  className={
                    g
                      ? "mt-1 text-xs leading-5 text-ink/35"
                      : "mt-1 text-xs leading-5 text-white/35"
                  }
                >
                  {details}
                </p>
              )}

              {guestName && (
                <span
                  className={
                    g
                      ? "mt-1.5 inline-block rounded-full bg-ink/10 px-2.5 py-0.5 text-[10px] text-ink"
                      : "mt-1.5 inline-block rounded-full bg-[#d7a45a]/10 px-2.5 py-0.5 text-[10px] text-[#d7a45a]"
                  }
                >
                  For {guestName}
                </span>
              )}
            </div>

            <p
              className={
                g
                  ? "shrink-0 text-sm font-medium text-ink/80"
                  : "shrink-0 text-sm font-medium text-white/80"
              }
            >
              ₹{totalPrice}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div
              className={
                g
                  ? "flex h-9 items-center rounded-full border border-ink/10 bg-ink/2.5"
                  : "flex h-9 items-center rounded-full border border-white/10 bg-white/2.5"
              }
            >
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(item.cartItemId, item.quantity - 1)
                }
                className={
                  g
                    ? "flex h-9 w-9 items-center justify-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-ink"
                    : "flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
                }
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus size={14} />
              </button>

              <span
                className={
                  g
                    ? "w-8 text-center text-xs font-medium text-ink/70"
                    : "w-8 text-center text-xs font-medium text-white/70"
                }
              >
                {item.quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  onQuantityChange(
                    item.cartItemId,
                    Math.min(MAX_ITEM_QUANTITY, item.quantity + 1),
                  )
                }
                disabled={item.quantity >= MAX_ITEM_QUANTITY}
                className={
                  g
                    ? "flex h-9 w-9 items-center justify-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-ink disabled:cursor-default disabled:text-ink/15 disabled:hover:bg-transparent"
                    : "flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white disabled:cursor-default disabled:text-white/15 disabled:hover:bg-transparent"
                }
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.cartItemId)}
              className={
                g
                  ? "flex items-center gap-1.5 text-xs text-ink/25 transition hover:text-red-300"
                  : "flex items-center gap-1.5 text-xs text-white/25 transition hover:text-red-300"
              }
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
