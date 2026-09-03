"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import type { Order } from "@/types/order";

type OrderValidationPanelProps = {
  orders: Order[];
  onValidate: (orderId: string, code: string) => boolean;
};

export default function OrderValidationPanel({
  orders,
  onValidate,
}: OrderValidationPanelProps) {
  const pendingOrders = orders.filter(
    (order) => order.status === "awaiting_validation",
  );

  if (pendingOrders.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 rounded-[26px] border border-[#d7a45a]/25 bg-[#d7a45a]/[0.04] p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-[#d7a45a]" />

        <p className="text-sm font-medium text-[#d7a45a]">
          {pendingOrders.length} order
          {pendingOrders.length === 1 ? "" : "s"} awaiting validation
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pendingOrders.map((order) => (
          <ValidationCard
            key={order.id}
            order={order}
            onValidate={onValidate}
          />
        ))}
      </div>
    </section>
  );
}

function ValidationCard({
  order,
  onValidate,
}: {
  order: Order;
  onValidate: (orderId: string, code: string) => boolean;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    const success = onValidate(order.id, code);

    if (!success) {
      setError(true);
      return;
    }

    setError(false);
    setCode("");
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#151519] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/75">
          #{order.orderNumber}
        </p>

        <p className="text-xs text-white/35">{order.tableName}</p>
      </div>

      <p className="mt-1 text-xs text-white/30">
        ₹{order.total} · {order.items.length} items
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(false);
          }}
          placeholder="Code"
          inputMode="numeric"
          className={`w-full rounded-full border bg-white/2.5 px-4 py-2 text-center text-sm tracking-[0.3em] text-white outline-none ${
            error
              ? "border-red-400/50"
              : "border-white/10 focus:border-white/25"
          }`}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={code.length !== 4}
          className="flex shrink-0 items-center justify-center rounded-full bg-[#f5f2ea] px-4 text-[#0b0b0d] transition hover:scale-[1.03] disabled:opacity-30"
        >
          <CheckCircle2 size={16} />
        </button>
      </div>

      {error && (
        <p className="mt-2 text-center text-[10px] text-red-300/70">
          Incorrect code — try again
        </p>
      )}
    </div>
  );
}
