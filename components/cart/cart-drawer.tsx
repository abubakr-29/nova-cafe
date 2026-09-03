"use client";

import { ArrowLeft, ShoppingBag, X } from "lucide-react";
import { useEffect } from "react";

import type { CartItem as CartItemType } from "@/types/cart";
import CartItem from "@/components/cart/cart-item";
import { getCartItemUnitPrice } from "@/lib/cart";

type CartDrawerProps = {
  items: CartItemType[];
  open: boolean;
  onClose: () => void;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  onPlaceOrder: () => void;
};

export default function CartDrawer({
  items,
  open,
  onClose,
  onQuantityChange,
  onRemove,
  onPlaceOrder,
}: CartDrawerProps) {
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
        className="animate-drawer absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#111114] shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                Table 07
              </p>

              <h2 className="mt-1 text-lg font-medium text-white">
                Your order
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/35 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        {/* Items */}
        <div className="nova-scrollbar flex-1 overflow-y-auto px-6">
          {items.length > 0 ? (
            <div>
              <div className="flex items-center justify-between py-5">
                <p className="text-sm text-white/45">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-white/35 transition hover:text-white"
                >
                  Add more
                </button>
              </div>

              {items.map((item) => (
                <CartItem
                  key={item.cartItemId}
                  item={item}
                  onQuantityChange={onQuantityChange}
                  onRemove={onRemove}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 text-white/30">
                <ShoppingBag size={24} />
              </div>

              <h3 className="mt-5 text-lg font-medium text-white/80">
                Your order is empty
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-white/30">
                Add something delicious from the menu and it will appear here.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#f5f2ea] px-6 py-3 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.02]"
              >
                Browse menu
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <footer className="border-t border-white/8 bg-[#111114] px-6 pb-6 pt-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Subtotal</span>

                <span className="text-white/70">₹{subtotal}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/30">Taxes</span>

                <span className="text-white/30">Calculated at checkout</span>
              </div>

              <div className="my-4 border-t border-white/8" />

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/30">
                    Total
                  </p>

                  <p className="mt-1 text-2xl font-medium text-white">
                    ₹{subtotal}
                  </p>
                </div>

                <p className="text-xs text-white/25">Table 07</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onPlaceOrder}
              className="mt-6 flex h-14 w-full items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Place order</span>

              <span>₹{subtotal}</span>
            </button>

            <p className="mt-3 text-center text-[11px] text-white/20">
              You can add more items after placing this order.
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
