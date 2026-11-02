"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { calculateBill } from "@/lib/bill";
import type { Order, OrderStatus } from "@/types/order";

export type ActionResult = { ok: true } | { ok: false; error: string };

type StatusTone = "gold" | "green" | "plain" | "muted";

/** What a guest sees for each kitchen status. */
export function statusInfo(status: OrderStatus): {
  label: string;
  tone: StatusTone;
} {
  switch (status) {
    case "awaiting_validation":
      return { label: "Waiting for staff", tone: "gold" };
    case "pending":
    case "confirmed":
      return { label: "Sent to the kitchen", tone: "plain" };
    case "preparing":
      return { label: "Being prepared", tone: "plain" };
    case "ready":
      return { label: "Ready", tone: "green" };
    case "served":
    case "completed":
      return { label: "Served", tone: "muted" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
  }
}

const TONE_CLASS: Record<StatusTone, string> = {
  gold: "border-[#d7a45a]/30 bg-[#d7a45a]/10 text-[#d7a45a]",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  plain: "border-white/10 bg-white/5 text-white/65",
  muted: "border-white/8 bg-transparent text-white/35",
};

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

type OrdersSheetProps = {
  tableName: string;
  /** This table's orders, newest first. */
  orders: Order[];
  billRequested: boolean;
  paid: boolean;
  onClose: () => void;
  onRequestBill: () => Promise<ActionResult>;
  onCancelOrder: (orderId: string) => Promise<ActionResult>;
  onViewBill: () => void;
};

export default function OrdersSheet({
  tableName,
  orders,
  billRequested,
  paid,
  onClose,
  onRequestBill,
  onCancelOrder,
  onViewBill,
}: OrdersSheetProps) {
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const bill = calculateBill(orders);
  const hasBillable = orders.some((order) => order.status !== "cancelled");

  async function handleCancel(orderId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await onCancelOrder(orderId);
    setBusy(false);
    setConfirmingCancelId(null);
    if (!result.ok) setError(result.error);
  }

  async function handleRequestBill() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await onRequestBill();
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-110 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Your orders"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl border border-white/10 bg-[#101013] shadow-2xl sm:rounded-4xl"
      >
        <header className="flex shrink-0 items-center justify-between px-6 pb-3 pt-6">
          <div>
            <h2 className="text-xl font-medium text-white">Your orders</h2>
            <p className="mt-0.5 text-xs text-white/35">{tableName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/35">
              Nothing ordered yet.
            </p>
          ) : (
            <>
              {hasBillable && (
                <div className="rounded-3xl border border-white/10 bg-white/3.5 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                    Total so far
                  </p>
                  <p className="mt-1 text-3xl font-medium tabular-nums text-white">
                    {formatRupees(bill.total)}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-white/35">
                    {formatRupees(bill.subtotal)} + {formatRupees(bill.tax)} tax
                  </p>
                </div>
              )}

              {orders.map((order) => {
                const status = statusInfo(order.status);
                const cancelled = order.status === "cancelled";
                const awaiting = order.status === "awaiting_validation";
                const time = new Date(order.createdAt).toLocaleTimeString(
                  "en-IN",
                  { hour: "numeric", minute: "2-digit" },
                );

                return (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-white/8 bg-white/2.5 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            cancelled ? "text-white/40" : "text-white"
                          }`}
                        >
                          Order #{order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-white/30">{time}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${TONE_CLASS[status.tone]}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {awaiting && (
                      <div className="mt-4 rounded-2xl border border-[#d7a45a]/25 bg-[#d7a45a]/6 px-4 py-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-[#d7a45a]/70">
                          Show this to staff
                        </p>
                        <p className="mt-1.5 text-3xl font-medium tracking-[0.3em] text-[#d7a45a]">
                          {order.validationCode}
                        </p>
                      </div>
                    )}

                    <ul
                      className={`mt-4 space-y-2.5 ${
                        cancelled ? "opacity-40" : ""
                      }`}
                    >
                      {order.items.map((item) => (
                        <li
                          key={item.orderItemId}
                          className="flex items-start justify-between gap-4 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="text-white/80">
                              <span className="text-white/40">
                                {item.quantity} ×
                              </span>{" "}
                              {item.name}
                            </p>
                            {(item.size?.name || item.addons.length > 0) && (
                              <p className="mt-0.5 text-xs text-white/30">
                                {[
                                  item.size?.name,
                                  item.addons.map((a) => a.name).join(", "),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 tabular-nums text-white/60">
                            {formatRupees(item.totalPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {awaiting && (
                      <div className="mt-4 border-t border-white/8 pt-4">
                        {confirmingCancelId === order.id ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmingCancelId(null)}
                              className="h-11 rounded-full border border-white/10 text-xs font-medium text-white/60 transition hover:bg-white/5"
                            >
                              Keep order
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(order.id)}
                              disabled={busy}
                              className="h-11 rounded-full border border-red-400/30 bg-red-400/10 text-xs font-medium text-red-300 transition hover:bg-red-400/15 disabled:opacity-50"
                            >
                              {busy ? "Cancelling..." : "Yes, cancel it"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingCancelId(order.id)}
                            className="text-xs text-white/40 underline-offset-4 transition hover:text-white/70 hover:underline"
                          >
                            Cancel this order
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </div>

        {hasBillable && (
          <footer className="shrink-0 border-t border-white/8 bg-[#101013] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            {error && (
              <p role="alert" className="mb-3 text-center text-sm text-red-300">
                {error}
              </p>
            )}

            {paid ? (
              <p className="py-2 text-center text-sm text-white/50">
                Payment received. Thank you.
              </p>
            ) : billRequested ? (
              <button
                type="button"
                onClick={onViewBill}
                className="h-14 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99]"
              >
                View bill and pay
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRequestBill}
                  disabled={busy}
                  className="h-14 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {busy ? "Requesting..." : "Request the bill"}
                </button>
                <p className="mt-2 text-center text-xs text-white/30">
                  Done ordering? Request the bill when you are ready to pay.
                </p>
              </>
            )}
          </footer>
        )}

        {!hasBillable && error && (
          <p
            role="alert"
            className="px-6 pb-5 text-center text-sm text-red-300"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
