import type { Order } from "@/types/order";
import type { TableGuest } from "@/types/session";

export function calculateBill(orders: Order[]) {
  const billableOrders = orders.filter((order) => order.status !== "cancelled");

  const subtotal = billableOrders.reduce(
    (total, order) => total + order.subtotal,
    0,
  );

  const tax = billableOrders.reduce((total, order) => total + order.tax, 0);

  const total = billableOrders.reduce((total, order) => total + order.total, 0);

  return {
    subtotal,
    tax,
    total,
  };
}

export type GuestShare = {
  guestId: string;
  guestName: string;
  itemsTotal: number;
  tax: number;
  total: number;
};

export function calculateGuestShares(
  orders: Order[],
  guests: TableGuest[],
  taxRate: number,
): GuestShare[] {
  const guestCount = Math.max(guests.length, 1);
  const guestIds = new Set(guests.map((guest) => guest.id));

  const billableItems = orders
    .filter((order) => order.status !== "cancelled")
    .flatMap((order) => order.items);

  const unassignedTotal = billableItems
    .filter(
      (item) => !item.assignedGuestId || !guestIds.has(item.assignedGuestId),
    )
    .reduce((total, item) => total + item.totalPrice, 0);

  const unassignedSharePerGuest = unassignedTotal / guestCount;

  return guests.map((guest) => {
    const assignedTotal = billableItems
      .filter((item) => item.assignedGuestId === guest.id)
      .reduce((total, item) => total + item.totalPrice, 0);

    const itemsTotal = assignedTotal + unassignedSharePerGuest;
    const tax = Math.round(itemsTotal * taxRate);

    return {
      guestId: guest.id,
      guestName: guest.name,
      itemsTotal: Math.round(itemsTotal),
      tax,
      total: Math.round(itemsTotal) + tax,
    };
  });
}
