"use client";

import { Bell } from "lucide-react";
import { useMemo, useState } from "react";

import TableMap from "@/components/dashboard/table-map";
import TableDetail from "@/components/dashboard/table-detail";
import type { RestaurantTable } from "@/types/table";
import OrderQueue from "@/components/orders/order-queue";
import TableSessionDrawer from "@/components/dashboard/table-session";
import BillSheet from "@/components/dashboard/bill-sheet";
import { useRestaurantData } from "@/lib/restaurant-data-context";
import OrderValidationPanel from "@/components/orders/order-validation-panel";

export default function DashboardPage() {
  const {
    orders,
    sessions,
    tables,
    updateOrderStatus,
    requestBill,
    markSessionPaid,
    validateOrder,
    closeTableSession,
  } = useRestaurantData();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    "table-07",
  );
  const [sessionTableId, setSessionTableId] = useState<string | null>(null);
  const [billOpen, setBillOpen] = useState(false);

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ?? null;

  const occupiedTables = useMemo(
    () => tables.filter((table) => table.status === "occupied").length,
    [tables],
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "served" && order.status !== "completed",
      ).length,
    [orders],
  );

  const readyOrders = useMemo(
    () => orders.filter((order) => order.status === "ready").length,
    [orders],
  );

  const currentSales = useMemo(() => {
    return sessions.reduce((total, session) => {
      if (session.status !== "open") {
        return total;
      }

      return (
        total +
        session.orderIds.reduce((sessionTotal, orderId) => {
          const order = orders.find((order) => order.id === orderId);

          return sessionTotal + (order?.total ?? 0);
        }, 0)
      );
    }, 0);
  }, [orders, sessions]);

  const activeSession =
    sessions.find((session) => session.tableId === sessionTableId) ?? null;

  function handleSelectTable(table: RestaurantTable) {
    setSelectedTableId(table.id);
  }

  const billRequestedTableIds = useMemo(
    () =>
      new Set(
        sessions
          .filter(
            (session) =>
              session.status !== "closed" &&
              session.billRequested &&
              session.paymentStatus === "unpaid",
          )
          .map((session) => session.tableId),
      ),
    [sessions],
  );

  const paidTableIds = useMemo(
    () =>
      new Set(
        sessions
          .filter(
            (session) =>
              session.status !== "closed" && session.paymentStatus === "paid",
          )
          .map((session) => session.tableId),
      ),
    [sessions],
  );

  function handleRequestBillForTable(tableId: string) {
    const session = sessions.find((s) => s.tableId === tableId);

    if (!session) {
      return;
    }

    requestBill(session.id);
  }

  function handleFreeTable(tableId: string) {
    closeTableSession(tableId);

    if (sessionTableId === tableId) {
      setSessionTableId(null);
      setBillOpen(false);
    }
  }

  return (
    <>
      {/* Header */}
      <header className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6 md:px-10">
        <div>
          <p className="text-xs text-white/25">NOVA Café</p>

          <p className="mt-1 text-sm text-white/60">Restaurant dashboard</p>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:bg-white/5 hover:text-white"
        >
          <Bell size={16} />
        </button>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-375 px-6 py-8 md:px-10">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#d7a45a]">
            Overview
          </p>

          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-medium tracking-[-0.03em] md:text-4xl">
                Good afternoon.
              </h1>

              <p className="mt-2 text-sm text-white/30">
                Here&apos;s what&apos;s happening right now.
              </p>
            </div>

            <span className="text-xs text-white/25">Saturday · 29 August</span>
          </div>
        </div>

        {/* Stats */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Occupied tables"
            value={occupiedTables.toString()}
            detail={`of ${tables.length} tables`}
          />

          <StatCard
            label="Active orders"
            value={activeOrders.toString()}
            detail="across the floor"
          />

          <StatCard
            label="Open sales"
            value={`₹${currentSales.toLocaleString("en-IN")}`}
            detail="current sessions"
          />

          <StatCard
            label="Ready"
            value={readyOrders.toString()}
            detail="orders waiting"
          />
        </section>

        {/* Floor */}
        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Floor plan</p>

              <p className="mt-1 text-xs text-white/25">
                Front room · 8 tables
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Legend label="Available" className="bg-white/30" />

              <Legend label="Occupied" className="bg-[#d7a45a]" />

              <Legend label="Reserved" className="bg-blue-200/60" />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_380px]">
            <TableMap
              tables={tables}
              selectedTableId={selectedTableId}
              onSelectTable={handleSelectTable}
              billRequestedTableIds={billRequestedTableIds}
              paidTableIds={paidTableIds}
            />

            <TableDetail
              table={selectedTable}
              onViewSession={setSessionTableId}
              billRequested={
                selectedTable
                  ? billRequestedTableIds.has(selectedTable.id)
                  : false
              }
              paid={selectedTable ? paidTableIds.has(selectedTable.id) : false}
              onRequestBill={handleRequestBillForTable}
              onFreeTable={handleFreeTable}
            />
          </div>
        </section>

        <section className="mt-10 pb-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Live orders</p>

              <p className="mt-1 text-xs text-white/25">
                Keep the floor moving.
              </p>
            </div>

            <span className="text-xs text-white/25">
              {
                orders.filter(
                  (order) =>
                    order.status !== "served" && order.status !== "completed",
                ).length
              }{" "}
              active
            </span>
          </div>

          <OrderValidationPanel orders={orders} onValidate={validateOrder} />

          <OrderQueue orders={orders} onStatusChange={updateOrderStatus} />

          <TableSessionDrawer
            session={activeSession}
            orders={orders}
            onClose={() => setSessionTableId(null)}
            onOpenBill={() => {
              setBillOpen(true);
            }}
          />

          {billOpen && (
            <BillSheet
              session={activeSession}
              orders={orders}
              onClose={() => {
                setBillOpen(false);
                setSessionTableId(null);
              }}
              onMarkPaid={markSessionPaid}
            />
          )}
        </section>
      </div>
    </>
  );
}
function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 p-5">
      <p className="text-xs text-white/30">{label}</p>

      <p className="mt-3 text-2xl font-medium tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-white/20">{detail}</p>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />

      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}
