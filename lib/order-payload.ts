import type { CartItem } from "@/types/cart";

/**
 * The cart as the lines that place_order / staff_place_order expect.
 * (Prices are never sent: the database prices every line itself.)
 */
export function toOrderLines(cart: CartItem[]) {
  return cart.map((item) => ({
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    size_id: item.size?.id ?? null,
    addon_ids: item.addons.map((addon) => addon.id),
    note: item.note ?? null,
    guest_index: item.guestIndex ?? null,
  }));
}
