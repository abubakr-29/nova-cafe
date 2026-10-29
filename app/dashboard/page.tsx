"use client";

import { useMemo, useState } from "react";

import BillSheet from "@/components/dashboard/bill-sheet";
import StaleTables, {
  type StaleTable,
} from "@/components/dashboard/stale-tables";
import TableDetail from "@/components/dashboard/table-detail";
import TableDetailSheet from "@/components/dashboard/table-detail-sheet";
import TableGrid from "@/components/dashboard/table-grid";
import TableSessionDrawer from "@/components/dashboard/table-session";
import OrderQueue from "@/components/orders/order-queue";
import OrderValidationPanel from "@/components/orders/order-validation-panel";
import { applyBookingHold, useNow } from "@/lib/reservations";
import { useStaffData } from "@/lib/staff-data-context";
import type { RestaurantTable } from "@/types/table";

type Tab = "orders" | "tables";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedToday() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const {
    orders,
    sessions,
    tables,
    businessDay,
    updateOrderStatus,
    cancelOrder,
    requestBill,
    markSessionPaid,
    markSessionUnpaid,
    validateOrder,
    closeTableSession,
    updateSessionGuestCount,
    reserveTable,
    clearReservation,
  } = useStaffData();

  const [tab, setTab] = useState<Tab>("orders");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [sessionTableId, setSessionTableId] = useState<string | null>(null);
  const [billOpen, setBillOpen] = useState(false);

  // Ticks about once a minute: bookings start/end their hold, order ages update.
  const now = useNow();

  const openSessions = useMemo(
    () => sessions.filter((session) => session.status !== "closed"),
    [sessions],
  );

  const orderById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );

  const sessionTotal = (orderIds: string[]) =>
    orderIds.reduce((total, orderId) => {
      const order = orderById.get(orderId);

      return order && order.status !== "cancelled"
        ? total + order.total
        : total;
    }, 0);

  const tablesWithLiveData = useMemo(() => {
    return tables.map((table) => {
      const session = openSessions.find((s) => s.tableId === table.id);

      if (!session) {
        // A free table shows as reserved while a booking's hold is active.
        return applyBookingHold(table, now);
      }

      const sessionOrders = session.orderIds
        .map((orderId) => orderById.get(orderId))
        .filter((order): order is (typeof orders)[number] => Boolean(order))
        .filter((order) => order.status !== "cancelled");

      return {
        ...table,
        guestCount: session.guests.length,
        seatedAt: session.startedAt,
        currentTotal: sessionOrders.reduce(
          (total, order) => total + order.total,
          0,
        ),
        orders: sessionOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          itemCount: order.items.reduce((n, item) => n + item.quantity, 0),
        })),
      };
    });
  }, [tables, openSessions, orderById, now]);

  const selectedTable =
    tablesWithLiveData.find((table) => table.id === selectedTableId) ?? null;

  const occupiedTables = tables.filter(
    (table) => table.status === "occupied",
  ).length;

  const activeOrders = orders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "confirmed" ||
      order.status === "preparing" ||
      order.status === "ready",
  ).length;

  const openSales = openSessions.reduce(
    (total, session) => total + sessionTotal(session.orderIds),
    0,
  );

  // Orders of tables that are still open (their served orders stay on the board).
  const openOrderIds = useMemo(
    () => new Set(openSessions.flatMap((session) => session.orderIds)),
    [openSessions],
  );

  const billRequestedTableIds = useMemo(
    () =>
      new Set(
        openSessions
          .filter(
            (session) =>
              session.billRequested && session.paymentStatus !== "paid",
          )
          .map((session) => session.tableId),
      ),
    [openSessions],
  );

  // Guests who say they paid: staff still have to confirm it.
  const claimedTables = useMemo(
    () =>
      new Map(
        openSessions
          .filter((session) => session.paymentStatus === "claimed")
          .map((session) => [session.tableId, session.paymentMethod] as const),
      ),
    [openSessions],
  );

  const paidTableIds = useMemo(
    () =>
      new Set(
        openSessions
          .filter((session) => session.paymentStatus === "paid")
          .map((session) => session.tableId),
      ),
    [openSessions],
  );

  // Tables left open from before today's start.
  const staleTables: StaleTable[] = useMemo(() => {
    if (!businessDay) return [];

    const dayStart = new Date(businessDay.startsAt).getTime();

    return openSessions
      .filter((session) => new Date(session.startedAt).getTime() < dayStart)
      .map((session) => ({
        tableId: session.tableId,
        tableName: session.tableName,
        startedAt: session.startedAt,
        guestCount: session.guests.length,
        total: session.orderIds.reduce((total, orderId) => {
          const order = orderById.get(orderId);

          return order && order.status !== "cancelled"
            ? total + order.total
            : total;
        }, 0),
        paid: session.paymentStatus === "paid",
      }));
  }, [businessDay, openSessions, orderById]);

  const activeSession =
    sessions.find((session) => session.tableId === sessionTableId) ?? null;

  function handleSelectTable(table: RestaurantTable) {
    setSelectedTableId(table.id);
  }

  function handleRequestBillForTable(tableId: string) {
    const session = sessions.find((s) => s.tableId === tableId);

    if (session) requestBill(session.id);
  }

  function handleFreeTable(tableId: string) {
    closeTableSession(tableId);

    if (sessionTableId === tableId) {
      setSessionTableId(null);
      setBillOpen(false);
    }

    setSelectedTableId(null);
  }

  const tabs: { key: Tab; label: string; badge: number; gold: boolean }[] = [
    { key: "orders", label: "Orders", badge: activeOrders, gold: false },
    {
      key: "tables",
      label: "Tables",
      badge: billRequestedTableIds.size,
      gold: true,
    },
  ];

  return (
    <div className="mx-auto max-w-375 px-5 py-6 md:px-10 md:py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {getGreeting()}
        </h1>

        <p className="pb-0.5 text-sm text-white/40">{getFormattedToday()}</p>
      </div>

      {staleTables.length > 0 && (
        <div className="mt-5">
          <StaleTables tables={staleTables} onCloseTable={handleFreeTable} />
        </div>
      )}

      {/* Today at a glance */}
      <section
        aria-label="Today at a glance"
        className="mt-6 grid grid-cols-3 divide-x divide-white/[0.07] rounded-3xl border border-white/[0.07] bg-white/2.5"
      >
        <Stat
          label="Tables in use"
          value={`${occupiedTables}`}
          suffix={`/ ${tables.length}`}
        />

        <Stat label="Active orders" value={`${activeOrders}`} />

        <Stat
          label="Open sales"
          value={`₹${openSales.toLocaleString("en-IN")}`}
        />
      </section>

      {/* Orders / Tables */}
      <div
        role="tablist"
        aria-label="Dashboard view"
        className="mt-6 flex w-full rounded-full bg-white/6 p-1 sm:inline-flex sm:w-auto"
      >
        {tabs.map((item) => {
          const active = tab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-7 text-[15px] font-medium transition sm:flex-none ${
                active
                  ? "bg-[#f5f2ea] text-[#0b0b0d]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {item.label}

              {item.badge > 0 && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums ${
                    item.gold
                      ? "bg-[#d7a45a] text-[#0b0b0d]"
                      : active
                        ? "bg-black/10"
                        : "bg-white/12"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 pb-10">
        {tab === "orders" ? (
          <>
            <OrderValidationPanel
              orders={orders}
              onValidate={validateOrder}
              onCancel={cancelOrder}
            />

            <OrderQueue
              orders={orders}
              openOrderIds={openOrderIds}
              now={now}
              onStatusChange={updateOrderStatus}
              onCancel={cancelOrder}
            />
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/45">
              {occupiedTables} of {tables.length}{" "}
              {tables.length === 1 ? "table" : "tables"} in use
            </p>

            <TableGrid
              tables={tablesWithLiveData}
              selectedTableId={selectedTableId}
              onSelectTable={handleSelectTable}
              billRequestedTableIds={billRequestedTableIds}
              paidTableIds={paidTableIds}
              claimedTables={claimedTables}
              now={now}
            />
          </>
        )}
      </div>

      <TableDetailSheet
        open={selectedTable !== null}
        onClose={() => setSelectedTableId(null)}
      >
        <TableDetail
          table={selectedTable}
          onViewSession={(tableId) => {
            setSelectedTableId(null);
            setSessionTableId(tableId);
          }}
          billRequested={
            selectedTable ? billRequestedTableIds.has(selectedTable.id) : false
          }
          paid={selectedTable ? paidTableIds.has(selectedTable.id) : false}
          onRequestBill={handleRequestBillForTable}
          onFreeTable={handleFreeTable}
          onReserve={reserveTable}
          onClearReservation={clearReservation}
        />
      </TableDetailSheet>

      <TableSessionDrawer
        session={activeSession}
        orders={orders}
        onClose={() => setSessionTableId(null)}
        onOpenBill={() => setBillOpen(true)}
        onUpdateGuestCount={updateSessionGuestCount}
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
          onMarkUnpaid={markSessionUnpaid}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-5">
      <p className="text-xs text-white/45 md:text-sm">{label}</p>

      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
        {value}

        {suffix && (
          <span className="ml-1 text-sm font-normal text-white/35">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
