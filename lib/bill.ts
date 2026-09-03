import type { Order } from "@/types/order";

export const TAX_RATE = 0.05;

export function calculateBill(orders: Order[]) {
  const subtotal = orders.reduce((total, order) => total + order.total, 0);

  const tax = Math.round(subtotal * TAX_RATE);

  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
  };
}
