"use client";

import { Clock3, X } from "lucide-react";
import { useState } from "react";

export type StaleTable = {
  tableId: string;
  tableName: string;
  startedAt: string;
  guestCount: number;
  total: number;
  paid: boolean;
};

type StaleTablesProps = {
  tables: StaleTable[];
  onCloseTable: (tableId: string) => void;
};

// Tables left open from before today's start (someone forgot to free them overnight).
export default function StaleTables({
  tables,
  onCloseTable,
}: StaleTablesProps) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (tables.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-300" />

          <div>
            <p className="text-sm font-medium text-amber-100">
              {tables.length === 1
                ? "1 table is still open from before today"
                : `${tables.length} tables are still open from before today`}
            </p>

            <p className="mt-0.5 text-xs text-amber-100/60">
              Close them so today&apos;s numbers start clean.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 shrink-0 cursor-pointer rounded-full bg-amber-300 px-5 text-sm font-semibold text-[#0b0b0d] transition hover:bg-amber-200"
        >
          Review
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tables still open from before today"
            className="animate-sheet relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/8 bg-[#111114] sm:rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Still open from before
                </h2>

                <p className="mt-1 text-sm text-white/45">
                  Close each table once the guests have left.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/55 transition hover:bg-white/6"
              >
                <X size={16} />
              </button>
            </div>

            <ul className="nova-scrollbar mt-5 flex-1 space-y-3 overflow-y-auto px-6 pb-6">
              {tables.map((table) => (
                <li
                  key={table.tableId}
                  className="rounded-2xl border border-white/8 bg-white/3 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold">
                        {table.tableName}
                      </p>

                      <p className="mt-0.5 text-xs text-white/45">
                        Opened{" "}
                        {new Date(table.startedAt).toLocaleString("en-IN", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {table.guestCount}{" "}
                        {table.guestCount === 1 ? "guest" : "guests"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        ₹{table.total.toLocaleString("en-IN")}
                      </p>

                      <p
                        className={`mt-0.5 text-xs ${table.paid ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        {table.paid ? "Paid" : "Not paid"}
                      </p>
                    </div>
                  </div>

                  {confirmId === table.tableId ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="h-10 cursor-pointer rounded-xl border border-white/10 text-sm text-white/65 transition hover:bg-white/5"
                      >
                        Keep open
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onCloseTable(table.tableId);
                          setConfirmId(null);
                        }}
                        className="h-10 cursor-pointer rounded-xl bg-[#f5f2ea] text-sm font-semibold text-[#0b0b0d] transition hover:bg-white"
                      >
                        {table.paid ? "Close table" : "Close anyway"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(table.tableId)}
                      className="mt-3 h-10 w-full cursor-pointer rounded-xl border border-white/10 text-sm font-medium text-white/80 transition hover:bg-white/5"
                    >
                      Close table
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
