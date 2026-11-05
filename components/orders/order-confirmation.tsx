"use client";

import { Bell, Check, Clock3, Hash, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Order } from "@/types/order";

type OrderConfirmationProps = {
  order: Order;
  billRequested: boolean;
  onRequestBill: () => void;
  onCancel: () => void;
  onDone: () => void;
};

export default function OrderConfirmation({
  order,
  billRequested,
  onRequestBill,
  onCancel,
  onDone,
}: OrderConfirmationProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const canCancel = order.status === "awaiting_validation";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-120 overflow-y-auto guest-page font-menu px-5 py-8">
      <div className="mx-auto w-full max-w-lg text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-ink/30 bg-ink/10 text-ink">
          <Check size={32} strokeWidth={1.8} />
        </div>

        {/* Heading */}
        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-ink">
          Order received
        </p>

        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-ink md:text-5xl">
          We&apos;ve got it.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-ink/40">
          Your order has been sent to the team. Sit back and we&apos;ll take
          care of the rest.
        </p>

        {/* Order information */}
        <div className="mt-10 rounded-[28px] border border-ink/10 bg-ink/[0.035] p-5 text-left">
          <div className="flex items-center justify-between border-b border-ink/8 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/6 text-ink/60">
                <Hash size={16} />
              </div>

              <div>
                <p className="text-xs text-ink/30">Order</p>

                <p className="mt-1 text-sm font-medium text-ink">
                  #{order.orderNumber}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-ink/30">Table</p>

              <p className="mt-1 text-sm font-medium text-ink">
                {order.tableName}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4 py-5">
            {order.items.map((item) => (
              <div
                key={item.orderItemId}
                className="flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink/75">{item.name}</p>

                  <div className="mt-1 text-xs text-ink/30">
                    {item.size?.name && <span>{item.size.name}</span>}

                    {item.addons.length > 0 && (
                      <>
                        {item.size && " · "}

                        <span>
                          {item.addons.map((addon) => addon.name).join(", ")}
                        </span>
                      </>
                    )}

                    {item.note && (
                      <p className="mt-1">&quot;{item.note}&quot;</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-ink/35">× {item.quantity}</p>

                  <p className="mt-1 text-sm text-ink/70">₹{item.totalPrice}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-end justify-between border-t border-ink/8 pt-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink/25">
                Total
              </p>

              <p className="mt-1 text-2xl font-medium text-ink">
                ₹{order.total}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink/30">
              <Clock3 size={14} />
              Preparing soon
            </div>
          </div>
        </div>

        {/* Validation code */}
        <div className="mt-6 rounded-[28px] border border-ink/25 bg-ink/6 p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-ink/70">
            Show this to staff
          </p>

          <p className="mt-2 text-3xl font-medium tracking-[0.3em] text-ink">
            {order.validationCode}
          </p>

          <p className="mt-2 text-xs text-ink/30">
            A staff member will confirm your order using this code before
            it&apos;s sent to the kitchen.
          </p>
        </div>

        {/* Cancel order */}
        {canCancel && (
          <div className="mt-6">
            {confirmingCancel ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  className="h-13 rounded-full border border-ink/10 text-xs font-medium text-ink/60 transition hover:border-ink/20 hover:bg-ink/5"
                >
                  Keep order
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="h-13 rounded-full border border-red-400/30 bg-red-400/10 text-xs font-medium text-red-300 transition hover:bg-red-400/15"
                >
                  Yes, cancel it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="flex h-11 w-full items-center justify-center gap-1.5 text-xs text-ink/30 transition hover:text-red-300"
              >
                <X size={13} />
                Cancel this order
              </button>
            )}
          </div>
        )}

        {/* Request bill */}
        <button
          type="button"
          onClick={onRequestBill}
          disabled={billRequested}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-ink/10 text-sm font-medium text-ink/70 transition hover:border-ink/20 hover:bg-ink/5 disabled:cursor-default disabled:border-ink/30 disabled:bg-ink/10 disabled:text-ink"
        >
          <Bell size={15} />
          {billRequested ? "Bill requested — staff notified" : "Request bill"}
        </button>

        {/* Done */}
        <button
          type="button"
          onClick={onDone}
          className="mt-3 h-14 w-full rounded-full bg-ink text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99]"
        >
          Back to menu
        </button>
      </div>
    </div>
  );
}
