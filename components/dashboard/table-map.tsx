"use client";

import { Bell } from "lucide-react";

import type { RestaurantTable } from "@/types/table";

type TableMapProps = {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: RestaurantTable) => void;
  billRequestedTableIds: Set<string>;
};

const statusStyles = {
  available: {
    label: "Available",
    className:
      "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:bg-white/[0.05]",
  },

  occupied: {
    label: "Occupied",
    className:
      "border-[#d7a45a]/40 bg-[#d7a45a]/[0.08] text-[#d7a45a] hover:bg-[#d7a45a]/[0.12]",
  },

  reserved: {
    label: "Reserved",
    className:
      "border-blue-300/20 bg-blue-300/[0.06] text-blue-200/70 hover:bg-blue-300/[0.1]",
  },

  attention: {
    label: "Attention",
    className:
      "border-red-300/25 bg-red-300/[0.07] text-red-200/80 hover:bg-red-300/[0.11]",
  },
};

export default function TableMap({
  tables,
  selectedTableId,
  onSelectTable,
  billRequestedTableIds,
}: TableMapProps) {
  return (
    <div className="relative aspect-[1.35] min-h-70 overflow-hidden rounded-4xl border border-white/8 bg-[#111114] sm:min-h-100 lg:min-h-130">
      {/* Ambient grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Window */}
      <div className="absolute left-[7%] right-[7%] top-[6%] h-1 rounded-full bg-white/6" />

      <span className="absolute left-[7%] top-[2%] text-[9px] uppercase tracking-[0.25em] text-white/15">
        Window
      </span>

      {/* Counter */}
      <div className="absolute bottom-[5%] left-[6%] flex h-[8%] w-[20%] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/2.5">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
          Counter
        </span>
      </div>

      {/* Kitchen */}
      <div className="absolute bottom-[5%] right-[6%] flex h-[8%] w-[20%] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/2.5">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
          Kitchen
        </span>
      </div>

      {/* Tables */}
      {tables.map((table) => {
        const status = statusStyles[table.status];
        const selected = table.id === selectedTableId;
        const billRequested = billRequestedTableIds.has(table.id);

        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelectTable(table)}
            aria-label={`${table.name}, ${status.label}${
              billRequested ? ", bill requested" : ""
            }`}
            className={`absolute flex flex-col items-center justify-center border transition-all duration-300 ${status.className} ${
              selected
                ? "z-20 scale-105 border-[#f5f2ea] shadow-[0_0_0_4px_rgba(245,242,234,0.08)]"
                : ""
            } ${table.shape === "round" ? "rounded-full" : "rounded-2xl"}`}
            style={{
              left: `${table.position.x}%`,
              top: `${table.position.y}%`,
              width: `${table.position.width}%`,
              height: `${table.position.height}%`,
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            {billRequested && (
              <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#d7a45a] text-[#0b0b0d] shadow-[0_0_0_3px_#111114]">
                <Bell size={11} strokeWidth={2.5} />
              </span>
            )}

            <span className="text-xs font-medium">
              {table.name.replace("Table ", "")}
            </span>

            <span className="mt-1 text-[9px] text-current opacity-40">
              {table.seats} seats
            </span>

            {table.status === "occupied" && table.currentTotal && (
              <span className="mt-1 text-[9px] opacity-60">
                ₹{table.currentTotal}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
