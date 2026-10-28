"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import OrderCard from "@/components/orders/order-card";
import type { Order, OrderStatus } from "@/types/order";

type OrderQueueProps = {
  orders: Order[];
  /** Ids of orders that belong to tables still open (their served orders stay visible). */
  openOrderIds: Set<string>;
  now: number;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
};

type Filter = "new" | "preparing" | "ready" | "served";

const columns: {
  key: Exclude<Filter, "served">;
  label: string;
  hint: string;
  empty: string;
}[] = [
  {
    key: "new",
    label: "New",
    hint: "Waiting to be accepted",
    empty: "No new orders",
  },
  {
    key: "preparing",
    label: "Preparing",
    hint: "In the kitchen",
    empty: "Nothing being prepared",
  },
  {
    key: "ready",
    label: "Ready",
    hint: "Waiting to be served",
    empty: "Nothing waiting to be served",
  },
];

export default function OrderQueue({
  orders,
  openOrderIds,
  now,
  onStatusChange,
  onCancel,
}: OrderQueueProps) {
  const [filter, setFilter] = useState<Filter>("new");
  const [servedOpen, setServedOpen] = useState(false);
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase().replace(/^#/, "");

  const lists = useMemo(() => {
    const matches = (order: Order) =>
      !search ||
      order.orderNumber.toLowerCase().includes(search) ||
      order.tableName.toLowerCase().includes(search);

    const isServed = (order: Order) =>
      order.status === "served" || order.status === "completed";

    return {
      new: orders.filter(
        (o) =>
          (o.status === "pending" || o.status === "confirmed") && matches(o),
      ),
      preparing: orders.filter((o) => o.status === "preparing" && matches(o)),
      ready: orders.filter((o) => o.status === "ready" && matches(o)),
      // Served orders only stay on the board while their table is still open.
      served: orders.filter(
        (o) => isServed(o) && openOrderIds.has(o.id) && matches(o),
      ),
      servedToday: orders.filter(isServed).length,
    };
  }, [orders, openOrderIds, search]);

  function handleAction(order: Order) {
    const nextStatus = getNextStatus(order.status);

    if (nextStatus) onStatusChange(order.id, nextStatus);
  }

  const pills: { key: Filter; label: string; count: number }[] = [
    { key: "new", label: "New", count: lists.new.length },
    { key: "preparing", label: "Preparing", count: lists.preparing.length },
    { key: "ready", label: "Ready", count: lists.ready.length },
    { key: "served", label: "Served", count: lists.served.length },
  ];

  return (
    <div>
      {/* Phone: one status at a time. Desktop: all three side by side. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Order status"
          className="nova-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
        >
          {pills.map((pill) => {
            const active = filter === pill.key;

            return (
              <button
                key={pill.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(pill.key);
                  if (pill.key === "served") setServedOpen(true);
                }}
                className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                  active
                    ? "bg-[#f5f2ea] text-[#0b0b0d]"
                    : "bg-white/6 text-white/65 hover:bg-white/10"
                }`}
              >
                {pill.label}

                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
                    active
                      ? "bg-black/10"
                      : pill.count > 0 && pill.key !== "served"
                        ? "bg-[#d7a45a]/20 text-[#d7a45a]"
                        : "bg-white/8 text-white/45"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative block sm:ml-auto sm:w-64">
          <span className="sr-only">Find an order or table</span>

          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find order or table"
            className="h-10 w-full rounded-full border border-white/10 bg-white/4 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
        </label>
      </div>

      {/* Columns */}
      <div className="mt-4 lg:grid lg:grid-cols-3 lg:gap-5">
        {columns.map((column) => {
          const list = lists[column.key];

          return (
            <section
              key={column.key}
              className={`min-w-0 ${filter === column.key ? "block" : "hidden"} lg:block`}
            >
              <div className="mb-3 hidden items-baseline justify-between px-1 lg:flex">
                <div>
                  <h2 className="text-base font-medium text-white/85">
                    {column.label}
                  </h2>

                  <p className="mt-0.5 text-xs text-white/35">{column.hint}</p>
                </div>

                <span className="text-sm tabular-nums text-white/45">
                  {list.length}
                </span>
              </div>

              <div className="space-y-3">
                {list.length > 0 ? (
                  list.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      now={now}
                      onAction={() => handleAction(order)}
                      onCancel={onCancel}
                    />
                  ))
                ) : (
                  <div className="flex min-h-32 items-center justify-center rounded-3xl border border-dashed border-white/[0.07] px-5 text-center">
                    <p className="text-sm text-white/30">
                      {search ? "No orders match your search" : column.empty}
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Served: folded away so the board stays short */}
      <section
        className={`mt-6 ${filter === "served" ? "block" : "hidden"} lg:block`}
      >
        <button
          type="button"
          onClick={() => setServedOpen((open) => !open)}
          aria-expanded={servedOpen}
          className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-white/2.5 px-5 py-4 text-left transition hover:bg-white/5"
        >
          <span>
            <span className="text-base font-medium text-white/85">Served</span>

            <span className="mt-0.5 block text-xs text-white/35">
              {lists.served.length} at open tables · {lists.servedToday} served
              today
            </span>
          </span>

          <ChevronDown
            size={18}
            className={`text-white/45 transition-transform ${servedOpen ? "rotate-180" : ""}`}
          />
        </button>

        {servedOpen && (
          <ul className="mt-2 divide-y divide-white/6 rounded-2xl border border-white/8">
            {lists.served.length > 0 ? (
              lists.served.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/85">
                      <span className="font-semibold tabular-nums">
                        #{order.orderNumber}
                      </span>

                      <span className="ml-2 text-white/55">
                        {order.tableName}
                      </span>
                    </p>

                    <p className="mt-0.5 text-xs text-white/35">
                      {order.items.reduce((n, item) => n + item.quantity, 0)}{" "}
                      items ·{" "}
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm tabular-nums text-white/55">
                    ₹{order.total}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-5 py-6 text-center text-sm text-white/30">
                {search
                  ? "No orders match your search"
                  : "Nothing served at open tables"}
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "pending":
    case "confirmed":
      return "preparing";

    case "preparing":
      return "ready";

    case "ready":
      return "served";

    default:
      return null;
  }
}
