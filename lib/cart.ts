import type { CartItem } from "@/types/cart";

export function areCartItemsEquivalent(a: CartItem, b: CartItem) {
  if (a.menuItemId !== b.menuItemId) {
    return false;
  }

  if (a.size?.id !== b.size?.id) {
    return false;
  }

  if (a.note !== b.note) {
    return false;
  }

  if (a.addons.length !== b.addons.length) {
    return false;
  }

  const aAddonIds = a.addons.map((addon) => addon.id).sort();

  const bAddonIds = b.addons.map((addon) => addon.id).sort();

  return aAddonIds.every((id, index) => id === bAddonIds[index]);
}

export function getCartItemUnitPrice(item: CartItem) {
  const sizePrice = item.size?.price ?? 0;

  const addonPrice = item.addons.reduce((sum, addon) => sum + addon.price, 0);

  return item.basePrice + sizePrice + addonPrice;
}

export function getCartItemDetails(item: CartItem) {
  const details: string[] = [];

  if (item.size) {
    details.push(item.size.name);
  }

  if (item.addons.length > 0) {
    details.push(item.addons.map((addon) => addon.name).join(", "));
  }

  if (item.note) {
    details.push(`"${item.note}"`);
  }

  return details.join(" · ");
}

export function updateCartItemQuantity(
  cart: CartItem[],
  cartItemId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    return cart.filter((item) => item.cartItemId !== cartItemId);
  }

  return cart.map((item) =>
    item.cartItemId === cartItemId ? { ...item, quantity } : item,
  );
}

export function removeCartItem(cart: CartItem[], cartItemId: string) {
  return cart.filter((item) => item.cartItemId !== cartItemId);
}
