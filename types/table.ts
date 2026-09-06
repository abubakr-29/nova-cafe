import type { OrderStatus } from "@/types/order";

export type TableStatus = "available" | "occupied" | "reserved" | "attention";

export type TableShape = "round" | "square" | "rectangle";

export type TablePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TableOrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
};

export type RestaurantTable = {
  id: string;
  name: string;

  seats: number;
  status: TableStatus;

  shape: TableShape;
  position: TablePosition;

  sessionId?: string;
  guestCount?: number;

  orders?: TableOrderSummary[];

  currentTotal?: number;
};
