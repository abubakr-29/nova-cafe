"use client";

import { ArrowRight, Clock3, Users, X } from "lucide-react";
import { useState } from "react";

import type { Order } from "@/types/order";

type OrderCardProps = {
  order: Order;
  onAction: (orderId: string) => void;
  onCancel: (orderId: string) => void;
};

const actionLabels = {
  pending: "Accept order",
  confirmed: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark served",
};

const cancellableStatuses = new Set([
  "pending",
  "confirmed",
  "preparing",
  "ready",
]);

export default function OrderCard({
  order,
  onAction,
  onCancel,
}: OrderCardProps) {
  const actionLabel = actionLabels[order.status as keyof typeof actionLabels];
  const canCancel = cancellableStatuses.has(order.status);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  return (
    <article className="rounded-[22px] border border-white/8 bg-[#151519] p-4 transition hover:border-white/[0.14]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              #{order.orderNumber}
            </span>

            <span className="h-1 w-1 rounded-full bg-white/20" />

            <span className="text-xs text-white/35">{order.tableName}</span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-white/25">
            <span className="flex items-center gap-1.5">
              <Users size={12} />
              Table order
            </span>

            <span className="flex items-center gap-1.5">
              <Clock3 size={12} />
              {getTimeAgo(order.createdAt)}
            </span>
          </div>
        </div>

        <span className="text-sm font-medium text-white/65">
          ₹{order.total}
        </span>
      </div>

      {/* Items */}
      <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
        {order.items.map((item) => (
          <div
            key={item.orderItemId}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-white/65">
                <span className="mr-2 text-white/35">{item.quantity}×</span>

                {item.name}
              </p>

              {(item.size || item.addons.length > 0 || item.note) && (
                <p className="mt-1 truncate pl-5 text-[10px] text-white/25">
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

      {/* Action */}
      {actionLabel && (
        <button
          type="button"
          onClick={() => onAction(order.id)}
          className="mt-5 flex w-full items-center justify-between rounded-full bg-[#f5f2ea] px-4 py-3 text-xs font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>{actionLabel}</span>

          <ArrowRight size={14} />
        </button>
      )}

      {canCancel &&
        (confirmingCancel ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmingCancel(false)}
              className="rounded-full border border-white/10 py-2 text-[11px] text-white/55 transition hover:bg-white/5"
            >
              Keep order
            </button>

            <button
              type="button"
              onClick={() => onCancel(order.id)}
              className="rounded-full border border-red-400/30 bg-red-400/10 py-2 text-[11px] text-red-300 transition hover:bg-red-400/15"
            >
              Cancel order
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[10px] text-white/25 transition hover:text-red-300"
          >
            <X size={11} />
            Cancel order
          </button>
        ))}
    </article>
  );
}

function getTimeAgo(createdAt: string) {
  const difference = Math.max(0, Date.now() - new Date(createdAt).getTime());

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes === 1) {
    return "1 min ago";
  }

  return `${minutes} min ago`;
}
