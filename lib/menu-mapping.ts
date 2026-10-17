import type { Diet } from "@/lib/menu-import";
import type { MenuItem, MenuOption } from "@/types/menu";

type OptionRow = {
  id: string;
  name: string;
  price: number;
  sort_order?: number | null;
};

/** A menu_items row as returned by Supabase, with its sizes and add-ons. */
export type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean | null;
  diet?: Diet | null;
  category_id: string | null;
  menu_item_sizes?: OptionRow[] | null;
  menu_item_addons?: OptionRow[] | null;
};

/**
 * The owner's order first (sort_order), cheapest first as a tie-break. This
 * matters because the item sheet preselects the FIRST size: it must be the
 * small/cheap one (e.g. Half), never whichever row the database returned first.
 */
function toOptions(rows: OptionRow[] | null | undefined): MenuOption[] | undefined {
  if (!rows || rows.length === 0) return undefined;

  return [...rows]
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price,
    )
    .map(({ id, name, price }) => ({ id, name, price: Number(price) }));
}

export function mapMenuItems(
  rows: MenuItemRow[],
  categoryNameById: Map<string, string>,
): MenuItem[] {
  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: Number(item.price),
    image: item.image_url ?? "",
    category: categoryNameById.get(item.category_id ?? "") ?? "",
    categoryId: item.category_id ?? "",
    diet: item.diet ?? null,
    available: item.available !== false,
    sizes: toOptions(item.menu_item_sizes),
    addons: toOptions(item.menu_item_addons),
  }));
}
