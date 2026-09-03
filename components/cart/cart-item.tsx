"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type { CartItem as CartItemType } from "@/types/cart";
import { getCartItemDetails, getCartItemUnitPrice } from "@/lib/cart";

type CartItemProps = {
  item: CartItemType;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
};

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const unitPrice = getCartItemUnitPrice(item);
  const totalPrice = unitPrice * item.quantity;
  const details = getCartItemDetails(item);

  return (
    <article className="border-b border-white/8 py-5 last:border-b-0">
      <div className="flex gap-4">
        {/* Image */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/4">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-white">
                {item.name}
              </h3>

              {details && (
                <p className="mt-1 text-xs leading-5 text-white/35">
                  {details}
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm font-medium text-white/80">
              ₹{totalPrice}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex h-9 items-center rounded-full border border-white/10 bg-white/2.5">
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(item.cartItemId, item.quantity - 1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus size={14} />
              </button>

              <span className="w-8 text-center text-xs font-medium text-white/70">
                {item.quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  onQuantityChange(item.cartItemId, item.quantity + 1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.cartItemId)}
              className="flex items-center gap-1.5 text-xs text-white/25 transition hover:text-red-300"
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
