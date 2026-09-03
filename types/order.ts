import type { MenuOption } from "@/types/menu";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type OrderItem = {
  orderItemId: string;
  menuItemId: string;

  name: string;
  image: string;

  basePrice: number;
  quantity: number;

  size?: MenuOption;
  addons: MenuOption[];
  note?: string;

  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;

  restaurantId: string;
  tableId: string;
  tableName: string;

  items: OrderItem[];

  subtotal: number;
  tax: number;
  total: number;

  status: OrderStatus;

  createdAt: string;
};
