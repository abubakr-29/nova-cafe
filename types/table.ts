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

  reservedFor?: string;
  reservationNote?: string;

  onHold?: boolean;

  sessionId?: string;
  guestCount?: number;

  /** When the current party sat down (ISO). */
  seatedAt?: string;

  orders?: TableOrderSummary[];

  currentTotal?: number;
};
