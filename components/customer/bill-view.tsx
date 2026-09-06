"use client";

import { useState } from "react";
import { Check, Users, X } from "lucide-react";

import type { Order } from "@/types/order";
import type { TableSession } from "@/types/session";
import { calculateBill } from "@/lib/bill";

type BillViewProps = {
  session: TableSession;
  orders: Order[];
  onClose: () => void;
  onPay: () => void;
};

export default function BillView({
  session,
  orders,
  onClose,
  onPay,
}: BillViewProps) {
  const [view, setView] = useState<"overview" | "split">("overview");

  const sessionOrders = session.orderIds
    .map((orderId) => orders.find((order) => order.id === orderId))
    .filter((order): order is Order => Boolean(order));

  const bill = calculateBill(sessionOrders);
  const guestCount = Math.max(session.guests.length, 1);
  const equalShare = Math.ceil(bill.total / guestCount);
  const isPaid = session.paymentStatus === "paid";

  return (
    <div className="fixed inset-0 z-120 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <section className="nova-scrollbar relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-4xl border border-white/10 bg-[#101013] shadow-2xl sm:rounded-4xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-md transition hover:bg-black/60 hover:text-white"
        >
          <X size={18} />
        </button>

        {isPaid ? (
          /* Paid state */
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d7a45a]/30 bg-[#d7a45a]/10 text-[#d7a45a]">
              <Check size={26} strokeWidth={1.8} />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#d7a45a]">
              Payment received
            </p>

            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-white">
              ₹{bill.total.toLocaleString("en-IN")}
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-white/40">
              Thanks for dining with us. Hope to see you again soon.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-8 h-13 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="border-b border-white/8 px-6 py-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#d7a45a]">
                Your bill
              </p>

              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-white">
                {session.tableName}
              </h2>
            </header>

            <div className="px-6 py-6">
              {view === "overview" ? (
                <>
                  {/* Items */}
                  <div className="rounded-3xl border border-white/8 bg-white/2.5">
                    {sessionOrders.map((order, orderIndex) => (
                      <div
                        key={order.id}
                        className={
                          orderIndex === 0
                            ? "p-5"
                            : "border-t border-white/[0.07] p-5"
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/25">
                            Order #{order.orderNumber}
                          </span>

                          <span className="text-xs text-white/40">
                            ₹{order.total}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.orderItemId}
                              className="flex items-start justify-between gap-4"
                            >
                              <p className="text-xs text-white/60">
                                {item.quantity}× {item.name}
                              </p>

                              <span className="shrink-0 text-xs text-white/35">
                                ₹{item.totalPrice}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-6 rounded-3xl border border-white/8 bg-white/2 p-5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/35">Subtotal</span>
                      <span className="text-white/60">
                        ₹{bill.subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-white/35">Tax · 5%</span>
                      <span className="text-white/60">
                        ₹{bill.tax.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="my-4 border-t border-white/[0.07]" />

                    <div className="flex items-end justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/25">
                        Total
                      </span>
                      <span className="text-2xl font-medium text-white">
                        ₹{bill.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={onPay}
                      className="flex h-14 items-center justify-between rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>Pay full bill</span>
                      <span>₹{bill.total.toLocaleString("en-IN")}</span>
                    </button>

                    {guestCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setView("split")}
                        className="flex h-14 items-center justify-between rounded-full border border-white/10 px-6 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/5"
                      >
                        <span>Split between {guestCount}</span>
                        <Users size={16} />
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-center text-[10px] text-white/15">
                    This demo confirms payment instantly — live card/UPI
                    processing plugs in at checkout.
                  </p>
                </>
              ) : (
                <>
                  {/* Split view */}
                  <div className="rounded-3xl border border-[#d7a45a]/20 bg-[#d7a45a]/4 p-6 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#d7a45a]/10">
                      <Users size={18} className="text-[#d7a45a]" />
                    </div>

                    <p className="mt-4 text-sm text-white/60">
                      Split equally between {guestCount} guests
                    </p>

                    <p className="mt-2 text-3xl font-medium text-white">
                      ₹{equalShare.toLocaleString("en-IN")}
                    </p>

                    <p className="mt-1 text-xs text-white/25">per person</p>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={onPay}
                      className="flex h-14 items-center justify-center rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Confirm split payment
                    </button>

                    <button
                      type="button"
                      onClick={() => setView("overview")}
                      className="flex h-14 items-center justify-center rounded-full border border-white/10 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/5"
                    >
                      Back to full bill
                    </button>
                  </div>

                  <p className="mt-4 text-center text-[10px] text-white/15">
                    Everyone can see their share here — one confirmation settles
                    the table.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
