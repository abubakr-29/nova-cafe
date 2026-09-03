"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  Bell,
  LayoutGrid,
  Menu,
  Settings,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";

import { tables } from "@/data/tables";
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
    updateOrderStatus,
    requestBill,
    markSessionPaid,
    validateOrder,
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
    [],
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
              session.billRequested && session.paymentStatus === "unpaid",
          )
          .map((session) => session.tableId),
      ),
    [sessions],
  );

  const paidTableIds = useMemo(
    () =>
      new Set(
        sessions
          .filter((session) => session.paymentStatus === "paid")
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

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#f5f2ea]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.07] bg-[#0d0d10] px-5 py-7 lg:flex lg:flex-col">
          <div className="px-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              NOVA
            </p>

            <p className="mt-1 text-lg font-medium">Café</p>
          </div>

          <nav className="mt-10 space-y-1">
            <NavItem icon={<LayoutGrid size={16} />} label="Overview" active />

            <NavItem icon={<Utensils size={16} />} label="Floor" />

            <NavItem icon={<ShoppingBag size={16} />} label="Orders" />

            <NavItem
              href="/dashboard/menu"
              icon={<Menu size={16} />}
              label="Menu"
            />
          </nav>

          <div className="mt-auto space-y-1">
            <NavItem icon={<Settings size={16} />} label="Settings" />
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
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

                <span className="text-xs text-white/25">
                  Saturday · 29 August
                </span>
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    Floor plan
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    Front room · 8 tables
                  </p>
                </div>

                <div className="flex items-center gap-4">
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
                  paid={
                    selectedTable ? paidTableIds.has(selectedTable.id) : false
                  }
                  onRequestBill={handleRequestBillForTable}
                />
              </div>
            </section>

            <section className="mt-10 pb-10">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    Live orders
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    Keep the floor moving.
                  </p>
                </div>

                <span className="text-xs text-white/25">
                  {
                    orders.filter(
                      (order) =>
                        order.status !== "served" &&
                        order.status !== "completed",
                    ).length
                  }{" "}
                  active
                </span>
              </div>

              <OrderValidationPanel
                orders={orders}
                onValidate={validateOrder}
              />

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
        </div>
      </div>
    </main>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    active
      ? "bg-white/6 text-white"
      : "text-white/35 hover:bg-white/4 hover:text-white/70"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}

        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {icon}

      <span>{label}</span>
    </button>
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
    <div className="hidden items-center gap-2 sm:flex">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />

      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}
