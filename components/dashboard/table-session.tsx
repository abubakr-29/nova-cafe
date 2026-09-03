"use client";

import { ArrowRight, Receipt, Users, X } from "lucide-react";

import type { Order } from "@/types/order";
import type { TableSession } from "@/types/session";

type TableSessionProps = {
  session: TableSession | null;
  orders: Order[];
  onClose: () => void;
  onOpenBill: () => void;
};

export default function TableSessionDrawer({
  session,
  orders,
  onClose,
  onOpenBill,
}: TableSessionProps) {
  if (!session) {
    return null;
  }

  const sessionOrders = session.orderIds
    .map((orderId) => orders.find((order) => order.id === orderId))
    .filter((order): order is Order => Boolean(order));

  const subtotal = sessionOrders.reduce(
    (total, order) => total + order.total,
    0,
  );

  const itemCount = sessionOrders.reduce(
    (total, order) =>
      total + order.items.reduce((items, item) => items + item.quantity, 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-100">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close session"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside className="nova-scrollbar absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/8 bg-[#101013] shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/25">
              Active session
            </p>

            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-xl font-medium text-white">
                {session.tableName}
              </h2>

              <span className="rounded-full bg-[#d7a45a]/10 px-2.5 py-1 text-[9px] text-[#d7a45a]">
                Open
              </span>
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

        {/* Summary */}
        <div className="border-b border-white/8 px-6 py-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-white/25" />

              <span className="text-xs text-white/45">
                {session.guests.length} guests
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-white/25" />

              <span className="text-xs text-white/45">{itemCount} items</span>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="nova-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                Orders
              </p>

              <p className="mt-1 text-xs text-white/30">
                Everything ordered at this table
              </p>
            </div>

            <span className="text-xs text-white/25">
              {sessionOrders.length}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {sessionOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-[22px] border border-white/8 bg-white/2.5 p-5"
              >
                {/* Order heading */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/75">
                      #{order.orderNumber}
                    </p>

                    <p className="mt-1 text-[10px] capitalize text-[#d7a45a]/70">
                      {order.status}
                    </p>
                  </div>

                  <p className="text-sm text-white/60">₹{order.total}</p>
                </div>

                {/* Items */}
                <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
                  {order.items.map((item) => (
                    <div
                      key={item.orderItemId}
                      className="flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs text-white/55">
                          {item.quantity}× {item.name}
                        </p>

                        {(item.size || item.addons.length > 0) && (
                          <p className="mt-1 text-[10px] text-white/20">
                            {[
                              item.size?.name,
                              ...item.addons.map((addon) => addon.name),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-white/30">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/8 bg-[#101013] px-6 py-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
                Current bill
              </p>

              <p className="mt-2 text-2xl font-medium text-white">
                ₹{subtotal.toLocaleString("en-IN")}
              </p>
            </div>

            <p className="text-[10px] text-white/20">
              {sessionOrders.length} orders
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBill}
            className="mt-5 flex h-13 w-full items-center justify-between rounded-full bg-[#f5f2ea] px-5 text-xs font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>Open bill</span>

            <ArrowRight size={15} />
          </button>
        </div>
      </aside>
    </div>
  );
}
