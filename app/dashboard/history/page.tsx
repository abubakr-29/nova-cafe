"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import DayPicker from "@/components/ui/day-picker";
import { formatDay, formatDayRelative, shiftDay } from "@/lib/business-day";
import { useStaffData, type DayOrders } from "@/lib/staff-data-context";
import type { Order } from "@/types/order";

// Look back at any business day. Read-only; the live dashboard only carries today.
export default function HistoryPage() {
  const { fetchDay, businessDay } = useStaffData();

  const today = businessDay?.day ?? null;

  // null means "today", whatever today currently is.
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [result, setResult] = useState<DayOrders | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);

      const next = await fetchDay(selected ?? undefined);

      if (ignore) return;

      setResult(next);
      setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [fetchDay, selected, reloadKey]);

  const shown = selected ?? result?.day?.day ?? today;

  function goTo(day: string) {
    // Picking today (or later) just means "today".
    setSelected(today && day >= today ? null : day);
  }

  const summary = useMemo(() => {
    const orders = result?.orders ?? [];
    const counted = orders.filter(
      (order) =>
        order.status !== "cancelled" && order.status !== "awaiting_validation",
    );

    return {
      count: counted.length,
      sales: counted.reduce((total, order) => total + order.total, 0),
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    };
  }, [result]);

  // Newest first.
  const list = useMemo(() => [...(result?.orders ?? [])].reverse(), [result]);

  const atToday = !today || !shown || shown >= today;

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 md:px-10 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        History
      </h1>

      <p className="mt-1 text-sm text-white/45">
        Look back at any day. A day runs from opening time, so late-night orders
        stay with the evening they belong to.
      </p>

      {/* Day switcher */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Previous day"
          disabled={!shown}
          onClick={() => shown && goTo(shiftDay(shown, -1))}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          aria-label="Pick a day from the calendar"
          disabled={!shown}
          onClick={() => setCalendarOpen(true)}
          className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/3 px-5 text-[15px] font-medium transition hover:bg-white/6 sm:min-w-56 sm:flex-none"
        >
          <CalendarDays size={16} className="shrink-0 text-white/45" />
          <span>
            {shown ? formatDayRelative(shown, today) : "Loading"}
            {shown && formatDayRelative(shown, today) !== formatDay(shown) && (
              <span className="ml-2 font-normal text-white/40">
                {formatDay(shown)}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          aria-label="Next day"
          disabled={atToday}
          onClick={() => shown && goTo(shiftDay(shown, 1))}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          aria-label="Refresh"
          onClick={() => setReloadKey((key) => key + 1)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {calendarOpen && shown && (
        <DayPicker
          title="Pick a day"
          start={shown}
          end={shown}
          max={today}
          onPick={(day) => goTo(day)}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {result?.error ? (
        <p className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/6 px-5 py-4 text-sm text-red-200">
          {result.error}
        </p>
      ) : (
        <>
          <section
            aria-label="Day summary"
            className="mt-6 grid grid-cols-3 divide-x divide-white/[0.07] rounded-3xl border border-white/[0.07] bg-white/2.5"
          >
            <Stat label="Orders" value={`${summary.count}`} />
            <Stat
              label="Sales"
              value={`₹${summary.sales.toLocaleString("en-IN")}`}
            />
            <Stat label="Cancelled" value={`${summary.cancelled}`} />
          </section>

          <div className="mt-6">
            {loading && !result ? (
              <p className="py-16 text-center text-sm text-white/35">
                Loading…
              </p>
            ) : list.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
                <p className="text-sm text-white/55">No orders on this day</p>
              </div>
            ) : (
              <ul
                className={`divide-y divide-white/6 overflow-hidden rounded-3xl border border-white/8 transition-opacity ${loading ? "opacity-50" : ""}`}
              >
                {list.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const statusChips: Record<string, { label: string; className: string }> = {
  served: { label: "Served", className: "bg-emerald-400/12 text-emerald-300" },
  completed: {
    label: "Served",
    className: "bg-emerald-400/12 text-emerald-300",
  },
  cancelled: { label: "Cancelled", className: "bg-red-400/12 text-red-300" },
  awaiting_validation: {
    label: "Not confirmed",
    className: "bg-white/8 text-white/50",
  },
};

function OrderRow({ order }: { order: Order }) {
  const chip = statusChips[order.status] ?? {
    label: "Unfinished",
    className: "bg-amber-300/12 text-amber-300",
  };

  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-white/3 [&::-webkit-details-marker]:hidden">
          <span className="w-16 shrink-0 text-sm tabular-nums text-white/45">
            {new Date(order.createdAt).toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-white/90">
              <span className="font-semibold tabular-nums">
                #{order.orderNumber}
              </span>

              <span className="ml-2 text-white/55">{order.tableName}</span>
            </span>

            <span className="mt-0.5 block truncate text-xs text-white/40">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </span>

          <span
            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:block ${chip.className}`}
          >
            {chip.label}
          </span>

          <span
            className={`w-20 shrink-0 text-right text-sm tabular-nums ${
              order.status === "cancelled"
                ? "text-white/30 line-through"
                : "text-white/80"
            }`}
          >
            ₹{order.total.toLocaleString("en-IN")}
          </span>
        </summary>

        <div className="border-t border-white/6 bg-white/2 px-5 py-4 sm:pl-25">
          <span
            className={`mb-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-medium sm:hidden ${chip.className}`}
          >
            {chip.label}
          </span>

          <ul className="space-y-2">
            {order.items.map((item) => (
              <li
                key={item.orderItemId}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span className="min-w-0 text-white/75">
                  <span className="mr-2 tabular-nums text-white/40">
                    {item.quantity}×
                  </span>

                  {item.name}

                  {(item.size || item.addons.length > 0) && (
                    <span className="block text-xs text-white/40">
                      {[item.size?.name, ...item.addons.map((a) => a.name)]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </span>

                <span className="shrink-0 tabular-nums text-white/45">
                  ₹{item.totalPrice}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 border-t border-white/6 pt-3 text-xs text-white/45">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">₹{order.subtotal}</dd>
            </div>

            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd className="tabular-nums">₹{order.tax}</dd>
            </div>

            <div className="flex justify-between text-sm text-white/80">
              <dt>Total</dt>
              <dd className="tabular-nums">₹{order.total}</dd>
            </div>
          </dl>
        </div>
      </details>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-5">
      <p className="text-xs text-white/45 md:text-sm">{label}</p>

      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
        {value}
      </p>
    </div>
  );
}
