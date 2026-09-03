"use client";

import { Bell, Check, Clock3, Hash } from "lucide-react";

import type { Order } from "@/types/order";

type OrderConfirmationProps = {
  order: Order;
  billRequested: boolean;
  onRequestBill: () => void;
  onDone: () => void;
};

export default function OrderConfirmation({
  order,
  billRequested,
  onRequestBill,
  onDone,
}: OrderConfirmationProps) {
  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#0b0b0d] px-5">
      <div className="w-full max-w-lg text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#d7a45a]/30 bg-[#d7a45a]/10 text-[#d7a45a]">
          <Check size={32} strokeWidth={1.8} />
        </div>

        {/* Heading */}
        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-[#d7a45a]">
          Order received
        </p>

        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-white md:text-5xl">
          We&apos;ve got it.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/40">
          Your order has been sent to the team. Sit back and we&apos;ll take
          care of the rest.
        </p>

        {/* Order information */}
        <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 text-left">
          <div className="flex items-center justify-between border-b border-white/8 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-white/60">
                <Hash size={16} />
              </div>

              <div>
                <p className="text-xs text-white/30">Order</p>

                <p className="mt-1 text-sm font-medium text-white">
                  #{order.orderNumber}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-white/30">Table</p>

              <p className="mt-1 text-sm font-medium text-white">
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
                  <p className="text-sm text-white/75">{item.name}</p>

                  <div className="mt-1 text-xs text-white/30">
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
                  <p className="text-xs text-white/35">× {item.quantity}</p>

                  <p className="mt-1 text-sm text-white/70">
                    ₹{item.totalPrice}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-end justify-between border-t border-white/8 pt-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/25">
                Total
              </p>

              <p className="mt-1 text-2xl font-medium text-white">
                ₹{order.total}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/30">
              <Clock3 size={14} />
              Preparing soon
            </div>
          </div>
        </div>

        {/* Request bill */}
        <button
          type="button"
          onClick={onRequestBill}
          disabled={billRequested}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-default disabled:border-[#d7a45a]/30 disabled:bg-[#d7a45a]/10 disabled:text-[#d7a45a]"
        >
          <Bell size={15} />
          {billRequested ? "Bill requested — staff notified" : "Request bill"}
        </button>

        {/* Done */}
        <button
          type="button"
          onClick={onDone}
          className="mt-3 h-14 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          Back to menu
        </button>
      </div>
    </div>
  );
}
