"use client";

import { ArrowLeft, ShoppingBag, X } from "lucide-react";
import { useEffect } from "react";

import type { CartItem as CartItemType } from "@/types/cart";
import type { TableGuest } from "@/types/session";
import CartItem from "@/components/cart/cart-item";
import { getCartItemUnitPrice } from "@/lib/cart";

type CartDrawerProps = {
  items: CartItemType[];
  guests: TableGuest[];
  open: boolean;
  onClose: () => void;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  onPlaceOrder: () => void;
  submitting?: boolean;
  tableName: string;
  /** "guest" = dark strata look for customers. Staff keeps the default. */
  variant?: "staff" | "guest";
};

export default function CartDrawer({
  items,
  guests,
  open,
  onClose,
  onQuantityChange,
  onRemove,
  onPlaceOrder,
  tableName,
  submitting = false,
  variant = "staff",
}: CartDrawerProps) {
  const g = variant === "guest";
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = items.reduce(
    (total, item) => total + getCartItemUnitPrice(item) * item.quantity,
    0,
  );

  return (
    <div className="fixed inset-0 z-110">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close order"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
        className={
          g
            ? "font-menu animate-drawer absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-ink/10 guest-surface shadow-2xl"
            : "animate-drawer absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#111114] shadow-2xl"
        }
      >
        {/* Header */}
        <header
          className={
            g
              ? "flex items-center justify-between border-b border-ink/8 px-6 py-5"
              : "flex items-center justify-between border-b border-white/8 px-6 py-5"
          }
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to menu"
              className={
                g
                  ? "flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
                  : "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
              }
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <p
                className={
                  g
                    ? "text-xs uppercase tracking-[0.2em] text-ink/30"
                    : "text-xs uppercase tracking-[0.2em] text-white/30"
                }
              >
                {tableName}
              </p>

              <h2
                className={
                  g
                    ? "mt-1 text-lg font-medium text-ink"
                    : "mt-1 text-lg font-medium text-white"
                }
              >
                Your order
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={
              g
                ? "flex h-10 w-10 items-center justify-center rounded-full text-ink/35 transition hover:bg-ink/5 hover:text-ink"
                : "flex h-10 w-10 items-center justify-center rounded-full text-white/35 transition hover:bg-white/5 hover:text-white"
            }
          >
            <X size={18} />
          </button>
        </header>

        {/* Items */}
        <div className="nova-scrollbar flex-1 overflow-y-auto px-6">
          {items.length > 0 ? (
            <div>
              <div className="flex items-center justify-between py-5">
                <p
                  className={
                    g ? "text-sm text-ink/45" : "text-sm text-white/45"
                  }
                >
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className={
                    g
                      ? "text-xs text-ink/35 transition hover:text-ink"
                      : "text-xs text-white/35 transition hover:text-white"
                  }
                >
                  Add more
                </button>
              </div>

              {items.map((item) => (
                <CartItem
                  key={item.cartItemId}
                  item={item}
                  guestName={
                    guests.length > 1 && item.guestIndex
                      ? guests[item.guestIndex - 1]?.name
                      : undefined
                  }
                  onQuantityChange={onQuantityChange}
                  onRemove={onRemove}
                  variant={variant}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className={
                  g
                    ? "flex h-16 w-16 items-center justify-center rounded-full border border-ink/10 text-ink/30"
                    : "flex h-16 w-16 items-center justify-center rounded-full border border-white/10 text-white/30"
                }
              >
                <ShoppingBag size={24} />
              </div>

              <h3
                className={
                  g
                    ? "mt-5 text-lg font-medium text-ink/80"
                    : "mt-5 text-lg font-medium text-white/80"
                }
              >
                Your order is empty
              </h3>

              <p
                className={
                  g
                    ? "mt-2 max-w-xs text-sm leading-6 text-ink/30"
                    : "mt-2 max-w-xs text-sm leading-6 text-white/30"
                }
              >
                Add something delicious from the menu and it will appear here.
              </p>

              <button
                type="button"
                onClick={onClose}
                className={
                  g
                    ? "mt-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-ink-dark transition hover:scale-[1.02]"
                    : "mt-6 rounded-full bg-[#f5f2ea] px-6 py-3 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02]"
                }
              >
                Browse menu
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <footer
            className={
              g
                ? "border-t border-ink/8 guest-surface px-6 pb-6 pt-5"
                : "border-t border-white/8 bg-[#111114] px-6 pb-6 pt-5"
            }
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={g ? "text-ink/40" : "text-white/40"}>
                  Subtotal
                </span>

                <span className={g ? "text-ink/70" : "text-white/70"}>
                  ₹{subtotal}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={g ? "text-ink/30" : "text-white/30"}>
                  Taxes
                </span>

                <span className={g ? "text-ink/30" : "text-white/30"}>
                  Calculated at checkout
                </span>
              </div>

              <div
                className={
                  g
                    ? "my-4 border-t border-ink/8"
                    : "my-4 border-t border-white/8"
                }
              />

              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={
                      g
                        ? "text-xs uppercase tracking-[0.18em] text-ink/30"
                        : "text-xs uppercase tracking-[0.18em] text-white/30"
                    }
                  >
                    Total
                  </p>

                  <p
                    className={
                      g
                        ? "mt-1 text-2xl font-medium text-ink"
                        : "mt-1 text-2xl font-medium text-white"
                    }
                  >
                    ₹{subtotal}
                  </p>
                </div>

                <p
                  className={
                    g ? "text-xs text-ink/25" : "text-xs text-white/25"
                  }
                >
                  {tableName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onPlaceOrder}
              disabled={submitting}
              className={
                g
                  ? "mt-6 flex h-14 w-full items-center justify-between rounded-full bg-ink px-6 text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  : "mt-6 flex h-14 w-full items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              }
            >
              <span>{submitting ? "Placing order..." : "Place order"}</span>
              <span>₹{subtotal}</span>
            </button>

            <p
              className={
                g
                  ? "mt-3 text-center text-[11px] text-ink/20"
                  : "mt-3 text-center text-[11px] text-white/20"
              }
            >
              You can add more items after placing this order.
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
