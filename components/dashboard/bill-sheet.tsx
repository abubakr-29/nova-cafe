"use client";

import { Check, Receipt, Users, X } from "lucide-react";

import type { Order } from "@/types/order";
import type { TableSession } from "@/types/session";

import { calculateBill } from "@/lib/bill";

type BillSheetProps = {
  session: TableSession | null;
  orders: Order[];
  onClose: () => void;
  onMarkPaid: (sessionId: string) => void;
};

export default function BillSheet({
  session,
  orders,
  onClose,
  onMarkPaid,
}: BillSheetProps) {
  if (!session) {
    return null;
  }

  const sessionOrders = session.orderIds
    .map((orderId) => orders.find((order) => order.id === orderId))
    .filter((order): order is Order => Boolean(order));

  const bill = calculateBill(sessionOrders);

  const guestCount = Math.max(session.guests.length, 1);

  const equalShare = Math.ceil(bill.total / guestCount);

  const isPaid = session.paymentStatus === "paid";

  return (
    <div className="fixed inset-0 z-110">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close bill"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Sheet */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/8 bg-[#101013] shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
              <Receipt size={17} className="text-white/50" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                Bill
              </p>

              <h2 className="mt-1 text-lg font-medium">{session.tableName}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/35 transition hover:bg-white/5 hover:text-white"
          >
            <X size={15} />
          </button>
        </header>

        {/* Content */}
        <div className="nova-scrollbar flex-1 overflow-y-auto px-6 py-6">
          {/* Summary */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-white/25" />

              <span className="text-xs text-white/45">
                {session.guests.length} guests
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-white/25" />

              <span className="text-xs text-white/45">
                {sessionOrders.length} orders
              </span>
            </div>
          </div>

          {/* Items */}
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                  Order summary
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Everything on this table&apos;s bill
                </p>
              </div>
            </div>

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
                        <div className="min-w-0">
                          <p className="text-xs text-white/60">
                            {item.quantity}× {item.name}
                          </p>

                          {(item.size ||
                            item.addons.length > 0 ||
                            item.note) && (
                            <p className="mt-1 truncate text-[10px] text-white/20">
                              {[
                                item.size?.name,
                                ...item.addons.map((addon) => addon.name),
                                item.note ? `"${item.note}"` : undefined,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-xs text-white/35">
                          ₹{item.totalPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Totals */}
          <section className="mt-6 rounded-3xl border border-white/8 bg-white/2 p-5">
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

              <span className="text-2xl font-medium">
                ₹{bill.total.toLocaleString("en-IN")}
              </span>
            </div>
          </section>

          {/* Split preview */}
          <section className="mt-6 rounded-3xl border border-[#d7a45a]/20 bg-[#d7a45a]/4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7a45a]/10">
                <Users size={15} className="text-[#d7a45a]" />
              </div>

              <div>
                <p className="text-sm font-medium text-white/70">
                  Splitting this bill?
                </p>

                <p className="mt-1 text-xs leading-5 text-white/30">
                  With {guestCount} guests, an equal split would be about ₹
                  {equalShare.toLocaleString("en-IN")} each.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/8 bg-[#101013] px-6 py-6">
          {isPaid ? (
            <div className="flex items-center justify-center gap-2 rounded-full border border-[#d7a45a]/25 bg-[#d7a45a]/8 py-4 text-sm text-[#d7a45a]">
              <Check size={16} />
              Paid
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onMarkPaid(session.id)}
                className="flex h-13 w-full items-center justify-between rounded-full bg-[#f5f2ea] px-5 text-xs font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Record payment received</span>
                <span>₹{bill.total.toLocaleString("en-IN")}</span>
              </button>

              <p className="mt-3 text-center text-[10px] text-white/15">
                Use this when a guest pays by cash or card in person. Online
                payment happens on the customer&apos;s own screen.
              </p>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}
