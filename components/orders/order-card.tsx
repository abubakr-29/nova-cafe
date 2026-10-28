"use client";

import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

import type { Order } from "@/types/order";

type OrderCardProps = {
  order: Order;
  /** Current time in ms, shared by the whole board so cards age together. */
  now: number;
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

type Urgency = "calm" | "warm" | "hot";

// How long is too long: food waiting to be made, or sitting ready at the pass.
function getUrgency(status: Order["status"], minutes: number): Urgency {
  const [warm, hot] = status === "ready" ? [5, 10] : [8, 15];

  if (minutes >= hot) return "hot";
  if (minutes >= warm) return "warm";
  return "calm";
}

const urgencyStyles: Record<Urgency, { card: string; age: string }> = {
  calm: { card: "border-white/8", age: "text-white/45" },
  warm: { card: "border-amber-300/30", age: "text-amber-300" },
  hot: {
    card: "border-red-400/45 bg-red-400/[0.04]",
    age: "text-red-300",
  },
};

export default function OrderCard({
  order,
  now,
  onAction,
  onCancel,
}: OrderCardProps) {
  const actionLabel = actionLabels[order.status as keyof typeof actionLabels];
  const canCancel = cancellableStatuses.has(order.status);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const minutes = getMinutesSince(order.createdAt, now);
  const urgency = getUrgency(order.status, minutes);
  const styles = urgencyStyles[urgency];
  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  return (
    <article
      className={`rounded-3xl border bg-[#151519] p-5 transition-colors ${styles.card}`}
    >
      {/* Who and how long */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[22px] font-semibold leading-none tracking-tight tabular-nums">
            #{order.orderNumber}
          </p>

          <p className="mt-2 inline-flex max-w-full rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/75">
            <span className="truncate">{order.tableName}</span>
          </p>
        </div>

        <p className={`text-sm font-medium tabular-nums ${styles.age}`}>
          {formatAge(minutes)}
        </p>
      </div>

      {/* What to make */}
      <ul className="mt-5 space-y-3.5 border-t border-white/[0.07] pt-5">
        {order.items.map((item) => {
          const details = [
            item.size?.name,
            ...item.addons.map((addon) => addon.name),
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li key={item.orderItemId} className="flex items-start gap-3">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/8 px-1.5 text-sm font-semibold tabular-nums text-white">
                {item.quantity}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug text-white/90">
                  {item.name}
                </p>

                {details && (
                  <p className="mt-0.5 text-xs leading-snug text-white/45">
                    {details}
                  </p>
                )}

                {item.note && (
                  <p className="mt-1.5 rounded-lg bg-amber-300/10 px-2.5 py-1.5 text-xs leading-snug text-amber-200">
                    Note: {item.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Total */}
      <div className="mt-5 flex items-center justify-between text-xs text-white/45">
        <span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>

        <span className="tabular-nums text-white/70">₹{order.total}</span>
      </div>

      {/* Action */}
      {actionLabel && (
        <button
          type="button"
          onClick={() => onAction(order.id)}
          className="mt-4 flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl bg-[#f5f2ea] px-5 text-[15px] font-semibold text-[#0b0b0d] transition active:scale-[0.99] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7a45a]"
        >
          <span>{actionLabel}</span>

          <ArrowRight size={18} />
        </button>
      )}

      {canCancel &&
        (confirmingCancel ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmingCancel(false)}
              className="h-10 cursor-pointer rounded-xl border border-white/10 text-sm text-white/65 transition hover:bg-white/5"
            >
              Keep order
            </button>

            <button
              type="button"
              onClick={() => onCancel(order.id)}
              className="h-10 cursor-pointer rounded-xl border border-red-400/30 bg-red-400/10 text-sm text-red-300 transition hover:bg-red-400/15"
            >
              Cancel order
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="mt-1 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 text-xs text-white/35 transition hover:text-red-300"
          >
            <X size={13} />
            Cancel order
          </button>
        ))}
    </article>
  );
}

function getMinutesSince(createdAt: string, now: number) {
  const current = now || Date.now();

  return Math.max(
    0,
    Math.floor((current - new Date(createdAt).getTime()) / 60000),
  );
}

function formatAge(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
