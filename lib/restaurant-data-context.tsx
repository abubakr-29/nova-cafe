"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { orders as initialOrders } from "@/data/orders";
import { sessions as initialSessions } from "@/data/sessions";
import type { Order, OrderStatus } from "@/types/order";
import type { TableSession } from "@/types/session";

type RestaurantDataContextValue = {
  orders: Order[];
  sessions: TableSession[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  requestBill: (sessionId: string) => void;
  markSessionPaid: (sessionId: string) => void;
};

const RestaurantDataContext = createContext<RestaurantDataContextValue | null>(
  null,
);

export function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [sessions, setSessions] = useState<TableSession[]>(initialSessions);

  function addOrder(order: Order) {
    setOrders((current) => [...current, order]);
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
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

  return (
    <RestaurantDataContext.Provider
      value={{
        orders,
        sessions,
        addOrder,
        updateOrderStatus,
        requestBill,
        markSessionPaid,
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
