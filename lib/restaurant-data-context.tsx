"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { orders as initialOrders } from "@/data/orders";
import { sessions as initialSessions } from "@/data/sessions";
import { menuItems as initialMenuItems } from "@/data/menu";
import type { Order, OrderStatus } from "@/types/order";
import type { TableSession } from "@/types/session";
import type { MenuItem } from "@/types/menu";

type RestaurantDataContextValue = {
  orders: Order[];
  sessions: TableSession[];
  menuItems: MenuItem[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  validateOrder: (orderId: string, code: string) => boolean;
  requestBill: (sessionId: string) => void;
  markSessionPaid: (sessionId: string) => void;
  toggleItemAvailability: (itemId: string) => void;
};

const RestaurantDataContext = createContext<RestaurantDataContextValue | null>(
  null,
);

export function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [sessions, setSessions] = useState<TableSession[]>(initialSessions);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

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
        addOrder,
        updateOrderStatus,
        validateOrder,
        requestBill,
        markSessionPaid,
        toggleItemAvailability,
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
