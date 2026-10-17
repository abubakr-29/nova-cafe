import type { Diet } from "@/lib/menu-import";

export type MenuOption = {
  id: string;
  name: string;
  price: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** The category this item belongs to ("" when it has none). */
  categoryId: string;
  image: string;
  diet?: Diet | null;
  available?: boolean;
  sizes?: MenuOption[];
  addons?: MenuOption[];
};

export type MenuCategory = {
  id: string;
  name: string;
};
