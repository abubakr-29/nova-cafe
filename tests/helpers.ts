import type { CartItem } from "@/types/cart";
import type { Order, OrderItem } from "@/types/order";

export function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderItemId: "oi-1",
    menuItemId: "m-1",
    name: "Cappuccino",
    image: "",
    basePrice: 100,
    quantity: 1,
    addons: [],
    unitPrice: 100,
    totalPrice: 100,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o-1",
    orderNumber: "001",
    validationCode: "1234",
    restaurantId: "r-1",
    tableId: "t-1",
    tableName: "Table 1",
    items: [makeOrderItem()],
    subtotal: 100,
    tax: 5,
    total: 105,
    status: "served",
    createdAt: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

export function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "c-1",
    menuItemId: "m-1",
    name: "Cappuccino",
    basePrice: 100,
    quantity: 1,
    addons: [],
    image: "",
    ...overrides,
  };
}
