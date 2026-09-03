import type { CartItem } from "@/types/cart";
import type { Order, OrderItem } from "@/types/order";
import { getCartItemUnitPrice } from "@/lib/cart";

type CreateOrderInput = {
  cart: CartItem[];

  restaurantId: string;
  tableId: string;
  tableName: string;
};

function generateOrderNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateValidationCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createOrder({
  cart,
  restaurantId,
  tableId,
  tableName,
}: CreateOrderInput): Order {
  const items: OrderItem[] = cart.map((item) => {
    const unitPrice = getCartItemUnitPrice(item);

    return {
      orderItemId: crypto.randomUUID(),

      menuItemId: item.menuItemId,

      name: item.name,
      image: item.image,

      basePrice: item.basePrice,
      quantity: item.quantity,

      size: item.size,
      addons: item.addons,
      note: item.note,

      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);

  return {
    id: crypto.randomUUID(),

    orderNumber: generateOrderNumber(),
    validationCode: generateValidationCode(),

    restaurantId,
    tableId,
    tableName,

    items,

    subtotal,
    tax: 0,
    total: subtotal,

    status: "awaiting_validation",

    createdAt: new Date().toISOString(),
  };
}
