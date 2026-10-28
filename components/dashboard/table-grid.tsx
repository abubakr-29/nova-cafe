"use client";

import { Bell, Check, Utensils } from "lucide-react";
import { useMemo } from "react";

import { compareTableNames } from "@/lib/table-layout";
import type { RestaurantTable } from "@/types/table";

type TableGridProps = {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: RestaurantTable) => void;
  billRequestedTableIds: Set<string>;
  paidTableIds: Set<string>;
  now: number;
};

const tileStyles = {
  available: "border-white/10 bg-white/3 hover:bg-white/6",
  occupied: "border-[#d7a45a]/30 bg-[#d7a45a]/[0.07] hover:bg-[#d7a45a]/[0.11]",
  reserved: "border-blue-300/25 bg-blue-300/[0.06] hover:bg-blue-300/10",
  attention: "border-red-300/30 bg-red-300/[0.07] hover:bg-red-300/11",
};

// Tables are shown by name in a plain grid instead of a drawn floor plan: it reads
// the same for every café, whatever its layout, and it works on a phone.
export default function TableGrid({
  tables,
  selectedTableId,
  onSelectTable,
  billRequestedTableIds,
  paidTableIds,
  now,
}: TableGridProps) {
  const sorted = useMemo(
    () => [...tables].sort((a, b) => compareTableNames(a.name, b.name)),
    [tables],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 px-6 text-center">
        <Utensils size={20} className="text-white/25" />

        <p className="mt-3 text-sm text-white/55">No tables yet</p>

        <p className="mt-1 text-xs text-white/30">
          Add your tables under Tables in the menu.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {sorted.map((table) => {
        const paid = paidTableIds.has(table.id);
        const billAsked = billRequestedTableIds.has(table.id);
        const readyCount =
          table.orders?.filter((order) => order.status === "ready").length ?? 0;
        const selected = table.id === selectedTableId;

        // One badge per table, most useful first: paid -> bill asked -> food ready.
        const badge = paid
          ? {
              label: "Paid",
              className: "bg-emerald-400/15 text-emerald-300",
              icon: <Check size={12} strokeWidth={3} />,
            }
          : billAsked
            ? {
                label: "Bill asked",
                className: "bg-[#d7a45a] text-[#0b0b0d]",
                icon: <Bell size={12} strokeWidth={2.5} />,
              }
            : readyCount > 0
              ? {
                  label: "Order ready",
                  className: "bg-emerald-400/15 text-emerald-300",
                  icon: <Check size={12} strokeWidth={3} />,
                }
              : null;

        return (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => onSelectTable(table)}
              aria-pressed={selected}
              className={`flex min-h-30 w-full cursor-pointer flex-col justify-between rounded-3xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7a45a] ${
                tileStyles[table.status]
              } ${selected ? "ring-2 ring-[#f5f2ea]/70" : ""}`}
            >
              <div>
                <p className="line-clamp-2 text-lg font-semibold leading-tight text-white">
                  {table.name}
                </p>

                <p className="mt-1 text-xs text-white/50">
                  {describeTable(table, now)}
                </p>
              </div>

              <div className="mt-3 flex min-h-6 items-end justify-between gap-2">
                {table.status === "occupied" && table.currentTotal ? (
                  <span className="text-base font-semibold tabular-nums text-[#d7a45a]">
                    ₹{table.currentTotal.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-xs text-white/35">
                    {table.seats} {table.seats === 1 ? "seat" : "seats"}
                  </span>
                )}

                {badge && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function describeTable(table: RestaurantTable, now: number) {
  if (table.status === "occupied") {
    const guests = table.guestCount ?? 0;
    const guestText = `${guests} ${guests === 1 ? "guest" : "guests"}`;

    if (!table.seatedAt) return guestText;

    const minutes = Math.max(
      0,
      Math.floor(
        ((now || Date.now()) - new Date(table.seatedAt).getTime()) / 60000,
      ),
    );

    return `${guestText} · ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`}`;
  }

  if (table.status === "reserved") return "Reserved";
  if (table.status === "attention") return "Needs attention";

  return "Free";
}
