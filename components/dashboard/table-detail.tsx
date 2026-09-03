"use client";

import {
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Users,
  Utensils,
} from "lucide-react";

import type { RestaurantTable } from "@/types/table";

type TableDetailProps = {
  table: RestaurantTable | null;
  onViewSession: (tableId: string) => void;
  billRequested: boolean;
  paid: boolean;
  onRequestBill: (tableId: string) => void;
};

const statusLabels = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  attention: "Needs attention",
};

export default function TableDetail({
  table,
  onViewSession,
  billRequested,
  paid,
  onRequestBill,
}: TableDetailProps) {
  if (!table) {
    return (
      <aside className="flex min-h-130 flex-col items-center justify-center rounded-4xl border border-white/8 bg-[#111114] px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white/25">
          <Utensils size={20} />
        </div>

        <h3 className="mt-5 text-sm font-medium text-white/60">
          Select a table
        </h3>

        <p className="mt-2 max-w-xs text-xs leading-5 text-white/25">
          Choose a table from the floor plan to see its current activity.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-130 flex-col rounded-4xl border border-white/8 bg-[#111114]">
      {/* Header */}
      <div className="border-b border-white/8 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
              Table
            </p>

            <h2 className="mt-2 text-2xl font-medium tracking-tight text-white">
              {table.name}
            </h2>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-[10px] ${
              table.status === "occupied"
                ? "bg-[#d7a45a]/10 text-[#d7a45a]"
                : table.status === "attention"
                  ? "bg-red-300/10 text-red-200/70"
                  : table.status === "reserved"
                    ? "bg-blue-300/10 text-blue-200/70"
                    : "bg-white/5 text-white/40"
            }`}
          >
            {statusLabels[table.status]}
          </span>
        </div>

        <div className="mt-6 flex gap-6">
          <div className="flex items-center gap-2 text-xs text-white/35">
            <Users size={14} />
            {table.guestCount ?? 0} guests
          </div>

          <div className="flex items-center gap-2 text-xs text-white/35">
            <Utensils size={14} />
            {table.seats} seats
          </div>
        </div>
      </div>

      {/* Session */}
      <div className="flex-1 overflow-y-auto p-6">
        {table.status === "available" ? (
          <div className="flex h-full min-h-65 flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/4 text-white/25">
              <Utensils size={18} />
            </div>

            <p className="mt-4 text-sm text-white/50">Table is ready</p>

            <p className="mt-2 text-xs text-white/25">No active session.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/25">
                  Current session
                </p>

                <p className="mt-2 text-2xl font-medium text-white">
                  ₹{table.currentTotal ?? 0}
                </p>
              </div>

              {table.sessionId && (
                <span className="text-[10px] text-white/20">
                  {table.sessionId}
                </span>
              )}
            </div>

            {/* Orders */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-white/50">Orders</p>

                <span className="text-[10px] text-white/20">
                  {table.orders?.length ?? 0}
                </span>
              </div>

              <div className="space-y-2">
                {table.orders?.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-2xl border border-white/[0.07] bg-white/2.5 p-4 text-left transition hover:border-white/13 hover:bg-white/4"
                  >
                    <div>
                      <p className="text-xs font-medium text-white/70">
                        #{order.orderNumber}
                      </p>

                      <p className="mt-1 text-[10px] text-white/25">
                        {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-white/60">₹{order.total}</p>

                        <p className="mt-1 text-[9px] capitalize text-[#d7a45a]/70">
                          {order.status}
                        </p>
                      </div>

                      <ChevronRight size={14} className="text-white/20" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Session timing */}
            <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/2 p-4">
              <div className="flex items-center gap-3">
                <Clock3 size={15} className="text-white/25" />

                <div>
                  <p className="text-xs text-white/50">Active session</p>

                  <p className="mt-1 text-[10px] text-white/25">
                    Orders can still be added
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {paid ? (
        <div className="mx-6 mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/8 px-4 py-3">
          <Check size={15} className="text-emerald-400" />
          <p className="text-xs text-emerald-400">This table has paid</p>
        </div>
      ) : (
        billRequested && (
          <div className="mx-6 mb-6 flex items-center gap-3 rounded-2xl border border-[#d7a45a]/25 bg-[#d7a45a]/8 px-4 py-3">
            <Bell size={15} className="text-[#d7a45a]" />
            <p className="text-xs text-[#d7a45a]">
              Bill requested for this table
            </p>
          </div>
        )
      )}

      {/* Actions */}
      <div className="border-t border-white/8 p-6">
        {table.status === "occupied" || table.status === "attention" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onViewSession(table.id)}
              className="rounded-full border border-white/10 py-3 text-xs text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              View session
            </button>

            {paid ? (
              <div className="flex items-center justify-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/8 py-3 text-xs text-emerald-400">
                <Check size={13} />
                Paid
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onRequestBill(table.id)}
                disabled={billRequested}
                className="rounded-full bg-[#f5f2ea] py-3 text-xs font-medium text-[#0b0b0d] transition hover:scale-[1.01] disabled:cursor-default disabled:bg-white/8 disabled:text-white/35 disabled:hover:scale-100"
              >
                {billRequested ? "Bill requested" : "Request bill"}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-full border border-white/10 py-3 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            View table
          </button>
        )}
      </div>
    </aside>
  );
}
