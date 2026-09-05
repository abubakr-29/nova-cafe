"use client";

import type { Order, OrderStatus } from "@/types/order";
import OrderCard from "@/components/orders/order-card";

type OrderQueueProps = {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
};

const columns: {
  status: OrderStatus;
  label: string;
  description: string;
}[] = [
  {
    status: "pending",
    label: "New",
    description: "Needs attention",
  },
  {
    status: "preparing",
    label: "Preparing",
    description: "Being prepared",
  },
  {
    status: "ready",
    label: "Ready",
    description: "Waiting for pickup",
  },
  {
    status: "served",
    label: "Served",
    description: "Delivered to table",
  },
];

export default function OrderQueue({
  orders,
  onStatusChange,
}: OrderQueueProps) {
  function handleAction(order: Order) {
    const nextStatus = getNextStatus(order.status);

    if (!nextStatus) {
      return;
    }

    onStatusChange(order.id, nextStatus);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => {
        const columnOrders = orders.filter(
          (order) => order.status === column.status,
        );

        return (
          <section key={column.status} className="min-w-0">
            {/* Column header */}
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <h2 className="text-sm font-medium text-white/70">
                  {column.label}
                </h2>

                <p className="mt-1 text-[10px] text-white/20">
                  {column.description}
                </p>
              </div>

              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] text-white/35">
                {columnOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {columnOrders.length > 0 ? (
                columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAction={() => handleAction(order)}
                  />
                ))
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-[22px] border border-dashed border-white/[0.07] bg-white/1 px-5 text-center">
                  <p className="text-[10px] text-white/20">Nothing here</p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "pending":
      return "preparing";

    case "preparing":
      return "ready";

    case "ready":
      return "served";

    default:
      return null;
  }
}
