"use client";

import { useState } from "react";
import { Check, Users, X } from "lucide-react";

import PayPanel from "@/components/customer/pay-panel";
import type { Order } from "@/types/order";
import type { TableSession } from "@/types/session";
import { calculateBill, calculateGuestShares } from "@/lib/bill";
import { useCustomerData } from "@/lib/customer-data-context";

type BillViewProps = {
  session: TableSession;
  orders: Order[];
  onClose: () => void;
  onClaim: (method: "upi" | "cash") => Promise<boolean>;
};

export default function BillView({
  session,
  orders,
  onClose,
  onClaim,
}: BillViewProps) {
  const { taxRate, paymentOptions, restaurantName } = useCustomerData();
  const [view, setView] = useState<"overview" | "split" | "pay">("overview");
  const [payAmount, setPayAmount] = useState(0);
  const [changing, setChanging] = useState(false);
  const [payFrom, setPayFrom] = useState<"overview" | "split">("overview");
  const [splitMode, setSplitMode] = useState<"equal" | "itemized">("equal");

  const sessionOrders = session.orderIds
    .map((orderId) => orders.find((order) => order.id === orderId))
    .filter((order): order is Order => Boolean(order));

  const bill = calculateBill(sessionOrders);
  const guestCount = Math.max(session.guests.length, 1);
  const equalShare = Math.ceil(bill.total / guestCount);
  const guestShares = calculateGuestShares(
    sessionOrders,
    session.guests,
    taxRate,
  );
  const hasAssignedItems = sessionOrders.some((order) =>
    order.items.some((item) => item.assignedGuestId),
  );
  const isPaid = session.paymentStatus === "paid";
  const isClaimed = session.paymentStatus === "claimed";
  const taxLabel = `${Math.round(taxRate * 1000) / 10}%`;

  function startPay(amount: number, from: "overview" | "split") {
    setPayAmount(amount);
    setPayFrom(from);
    setView("pay");
  }

  return (
    <div className="fixed inset-0 z-120 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <section className="nova-scrollbar font-menu relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-4xl border border-ink/10 guest-surface shadow-2xl sm:rounded-4xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-ink/60 backdrop-blur-md transition hover:bg-black/60 hover:text-ink"
        >
          <X size={18} />
        </button>

        {isPaid ? (
          /* Paid state */
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/30 bg-ink/10 text-ink">
              <Check size={26} strokeWidth={1.8} />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-ink">
              Payment received
            </p>

            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-ink">
              ₹{bill.total.toLocaleString("en-IN")}
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-ink/40">
              Thanks for dining with us. Hope to see you again soon.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-8 h-13 w-full rounded-full bg-ink text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99]"
            >
              Done
            </button>
          </div>
        ) : isClaimed && !changing ? (
          /* Waiting for staff to confirm */
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/30 bg-ink/10 text-ink">
              <Check size={26} strokeWidth={1.8} />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-ink">
              {session.paymentMethod === "cash"
                ? "Staff are on their way"
                : "Waiting for the café to confirm"}
            </p>

            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-ink">
              ₹{bill.total.toLocaleString("en-IN")}
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-ink/40">
              {session.paymentMethod === "cash"
                ? "Please keep the cash ready. A staff member will collect it at your table."
                : "We are checking your UPI payment. This usually takes a moment."}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-8 h-13 w-full rounded-full bg-ink text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99]"
            >
              Done
            </button>

            <button
              type="button"
              onClick={() => {
                setChanging(true);
                setView("overview");
              }}
              className="mt-3 h-11 text-xs text-ink/40 transition hover:text-ink/70"
            >
              Pay a different way
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="border-b border-ink/8 px-6 py-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink">
                Your bill
              </p>

              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-ink">
                {session.tableName}
              </h2>
            </header>

            <div className="px-6 py-6">
              {view === "pay" ? (
                <PayPanel
                  amount={payAmount}
                  note={`${restaurantName} ${session.tableName}`}
                  options={paymentOptions}
                  onClaim={async (method) => {
                    const ok = await onClaim(method);
                    if (ok) setChanging(false);
                    return ok;
                  }}
                  onBack={() => setView(payFrom)}
                />
              ) : view === "overview" ? (
                <>
                  {/* Items */}
                  <div className="rounded-3xl border border-ink/8 bg-ink/2.5">
                    {sessionOrders.map((order, orderIndex) => (
                      <div
                        key={order.id}
                        className={`${
                          orderIndex === 0
                            ? "p-5"
                            : "border-t border-ink/[0.07] p-5"
                        } ${order.status === "cancelled" ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ink/25">
                            Order #{order.orderNumber}
                            {order.status === "cancelled" && (
                              <span className="ml-2 text-red-300/70">
                                Cancelled — not billed
                              </span>
                            )}
                          </span>

                          <span className="text-xs text-ink/40">
                            ₹{order.total}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.orderItemId}
                              className="flex items-start justify-between gap-4"
                            >
                              <p className="text-xs text-ink/60">
                                {item.quantity}× {item.name}
                              </p>

                              <span className="shrink-0 text-xs text-ink/35">
                                ₹{item.totalPrice}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-6 rounded-3xl border border-ink/8 bg-ink/2 p-5">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink/35">Subtotal</span>
                      <span className="text-ink/60">
                        ₹{bill.subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-ink/35">Tax · {taxLabel}</span>
                      <span className="text-ink/60">
                        ₹{bill.tax.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="my-4 border-t border-ink/[0.07]" />

                    <div className="flex items-end justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-ink/25">
                        Total
                      </span>
                      <span className="text-2xl font-medium text-ink">
                        ₹{bill.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={() => startPay(bill.total, "overview")}
                      className="flex h-14 items-center justify-between rounded-full bg-ink px-6 text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>Pay full bill</span>
                      <span>₹{bill.total.toLocaleString("en-IN")}</span>
                    </button>

                    {guestCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setView("split")}
                        className="flex h-14 items-center justify-between rounded-full border border-ink/10 px-6 text-sm text-ink/70 transition hover:border-ink/20 hover:bg-ink/5"
                      >
                        <span>Split between {guestCount}</span>
                        <Users size={16} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Split view */}
                  {hasAssignedItems && (
                    <div className="mb-5 flex rounded-full border border-ink/10 bg-ink/2.5 p-1">
                      <button
                        type="button"
                        onClick={() => setSplitMode("equal")}
                        className={`flex-1 rounded-full py-2.5 text-xs font-medium transition ${
                          splitMode === "equal"
                            ? "bg-ink text-ink-dark"
                            : "text-ink/45"
                        }`}
                      >
                        Equal split
                      </button>

                      <button
                        type="button"
                        onClick={() => setSplitMode("itemized")}
                        className={`flex-1 rounded-full py-2.5 text-xs font-medium transition ${
                          splitMode === "itemized"
                            ? "bg-ink text-ink-dark"
                            : "text-ink/45"
                        }`}
                      >
                        By what each ordered
                      </button>
                    </div>
                  )}

                  {splitMode === "equal" || !hasAssignedItems ? (
                    <div className="rounded-3xl border border-ink/20 bg-ink/4 p-6 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink/10">
                        <Users size={18} className="text-ink" />
                      </div>

                      <p className="mt-4 text-sm text-ink/60">
                        Split equally between {guestCount} guests
                      </p>

                      <p className="mt-2 text-3xl font-medium text-ink">
                        ₹{equalShare.toLocaleString("en-IN")}
                      </p>

                      <p className="mt-1 text-xs text-ink/25">per person</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {guestShares.map((share) => (
                        <button
                          type="button"
                          key={share.guestId}
                          onClick={() => startPay(share.total, "split")}
                          className="flex w-full items-center justify-between rounded-2xl border border-ink/8 bg-ink/2.5 px-5 py-4 text-left transition hover:border-ink/20 hover:bg-ink/5"
                        >
                          <span className="text-sm text-ink/65">
                            {share.guestName}
                          </span>

                          <span className="text-sm font-medium text-ink">
                            ₹{share.total.toLocaleString("en-IN")} · Pay
                          </span>
                        </button>
                      ))}

                      <p className="pt-1 text-center text-[10px] text-ink/20">
                        Includes tax. Shared or unassigned items are split
                        evenly.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 grid gap-3">
                    {(splitMode === "equal" || !hasAssignedItems) && (
                      <button
                        type="button"
                        onClick={() => startPay(equalShare, "split")}
                        className="flex h-14 items-center justify-center rounded-full bg-ink text-sm font-medium text-ink-dark transition hover:scale-[1.01] active:scale-[0.99]"
                      >
                        Pay my share · ₹{equalShare.toLocaleString("en-IN")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setView("overview")}
                      className="flex h-14 items-center justify-center rounded-full border border-ink/10 text-sm text-ink/60 transition hover:border-ink/20 hover:bg-ink/5"
                    >
                      Back to full bill
                    </button>
                  </div>

                  <p className="mt-4 text-center text-[10px] text-ink/15">
                    Everyone pays their share to the same account. The café
                    confirms once the whole bill is in.
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
