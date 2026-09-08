"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { orders as initialOrders } from "@/data/orders";
import { sessions as initialSessions } from "@/data/sessions";
import { menuItems as initialMenuItems } from "@/data/menu";
import { tables as initialTables } from "@/data/tables";
import type { Order, OrderStatus } from "@/types/order";
import type { TableSession, TableGuest } from "@/types/session";
import type { MenuItem } from "@/types/menu";
import type { RestaurantTable } from "@/types/table";

type RestaurantDataContextValue = {
  orders: Order[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  addOrder: (order: Order, guestCount?: number) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string) => void;
  validateOrder: (orderId: string, code: string) => boolean;
  requestBill: (sessionId: string) => void;
  markSessionPaid: (sessionId: string) => void;
  toggleItemAvailability: (itemId: string) => void;
  closeTableSession: (tableId: string) => void;
  updateSessionGuestCount: (sessionId: string, guestCount: number) => void;
};

const RestaurantDataContext = createContext<RestaurantDataContextValue | null>(
  null,
);

export function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [sessions, setSessions] = useState<TableSession[]>(initialSessions);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);

  function addOrder(order: Order, guestCount?: number) {
    setOrders((current) => [...current, order]);

    const existingSession = sessions.find(
      (session) =>
        session.tableId === order.tableId && session.status !== "closed",
    );

    if (existingSession) {
      setSessions((current) =>
        current.map((session) =>
          session.id === existingSession.id
            ? { ...session, orderIds: [...session.orderIds, order.id] }
            : session,
        ),
      );

      setTables((current) =>
        current.map((table) =>
          table.id === order.tableId
            ? { ...table, status: "occupied", sessionId: existingSession.id }
            : table,
        ),
      );

      return;
    }

    const newSessionId = `session-${order.tableId}-${Date.now()}`;
    const safeGuestCount = Math.max(1, guestCount ?? 1);

    const guests: TableGuest[] = Array.from(
      { length: safeGuestCount },
      (_, index) => ({
        id: `guest-${order.tableId}-${index + 1}`,
        name: `Guest ${index + 1}`,
      }),
    );

    setSessions((current) => [
      ...current,
      {
        id: newSessionId,
        restaurantId: order.restaurantId,
        tableId: order.tableId,
        tableName: order.tableName,
        guests,
        orderIds: [order.id],
        startedAt: new Date().toISOString(),
        status: "open",
        billRequested: false,
        paymentStatus: "unpaid",
      },
    ]);

    setTables((current) =>
      current.map((table) =>
        table.id === order.tableId
          ? { ...table, status: "occupied", sessionId: newSessionId }
          : table,
      ),
    );
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
  }

  function cancelOrder(orderId: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "cancelled" } : order,
      ),
    );
  }

  function validateOrder(orderId: string, code: string) {
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.validationCode !== code) {
      return false;
    }

    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: "pending" } : o)),
    );

    return true;
  }

  function requestBill(sessionId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, billRequested: true }
          : session,
      ),
    );
  }

  function markSessionPaid(sessionId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, paymentStatus: "paid" }
          : session,
      ),
    );
  }

  function closeTableSession(tableId: string) {
    setSessions((current) =>
      current.map((session) =>
        session.tableId === tableId
          ? { ...session, status: "closed" }
          : session,
      ),
    );

    setTables((current) =>
      current.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status: "available",
              sessionId: undefined,
              guestCount: undefined,
              orders: undefined,
              currentTotal: undefined,
            }
          : table,
      ),
    );
  }

  function updateSessionGuestCount(sessionId: string, guestCount: number) {
    const safeGuestCount = Math.max(1, guestCount);

    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        if (safeGuestCount === session.guests.length) {
          return session;
        }

        if (safeGuestCount < session.guests.length) {
          return {
            ...session,
            guests: session.guests.slice(0, safeGuestCount),
          };
        }

        const additionalGuests: TableGuest[] = Array.from(
          { length: safeGuestCount - session.guests.length },
          (_, index) => ({
            id: `guest-${session.tableId}-${session.guests.length + index + 1}`,
            name: `Guest ${session.guests.length + index + 1}`,
          }),
        );

        return { ...session, guests: [...session.guests, ...additionalGuests] };
      }),
    );
  }

  function toggleItemAvailability(itemId: string) {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, available: item.available === false }
          : item,
      ),
    );
  }

  return (
    <RestaurantDataContext.Provider
      value={{
        orders,
        sessions,
        menuItems,
        tables,
        addOrder,
        updateOrderStatus,
        cancelOrder,
        validateOrder,
        requestBill,
        markSessionPaid,
        toggleItemAvailability,
        closeTableSession,
        updateSessionGuestCount,
      }}
    >
      {children}
    </RestaurantDataContext.Provider>
  );
}

export function useRestaurantData() {
  const context = useContext(RestaurantDataContext);

  if (!context) {
    throw new Error(
      "useRestaurantData must be used within a RestaurantDataProvider",
    );
  }

  return context;
}
