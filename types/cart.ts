import type { MenuOption } from "@/types/menu";

export type CartItem = {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  size?: MenuOption;
  addons: MenuOption[];
  note?: string;
  image: string;
};
