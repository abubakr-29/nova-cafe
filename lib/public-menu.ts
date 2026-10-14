import { cache } from "react";
import { connection } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";

export type PublicMenuSize = {
  name: string;
  /** The full price of the item in this size (base price + size extra). */
  price: number;
};

export type PublicMenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  /** Empty when the item has no size options. Sorted cheapest first. */
  sizes: PublicMenuSize[];
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

export type PublicMenu = {
  restaurantName: string;
  categories: PublicMenuCategory[];
};

/**
 * Loads a café's menu for the public, browse-only page: names and prices
 * only (no descriptions, images or add-ons).
 *
 * Returns null when there is no café with that slug. Wrapped in cache() so
 * generateMetadata and the page share one load per request.
 */
export const getPublicMenu = cache(
  async (slug: string): Promise<PublicMenu | null> => {
    // Always render at request time so price changes show up immediately.
    await connection();

    const supabase = createPublicClient();

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    // A failed lookup is an error (500), not "this café doesn't exist" (404).
    if (restaurantError) throw new Error("Couldn't load the menu.");
    if (!restaurant) return null;

    const [categoriesResult, itemsResult] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, price, available, category_id, sort_order, menu_item_sizes(name, price)",
        )
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
    ]);

    if (categoriesResult.error || itemsResult.error) {
      throw new Error("Couldn't load the menu.");
    }

    const categoryRows = categoriesResult.data ?? [];
    const itemRows = itemsResult.data ?? [];

    const toItem = (row: (typeof itemRows)[number]): PublicMenuItem => {
      const basePrice = Number(row.price);

      return {
        id: row.id,
        name: row.name,
        price: basePrice,
        available: row.available !== false,
        // Size prices are extras added on top of the base price, which is how
        // the cart and place_order charge them, so show the real total.
        sizes: (row.menu_item_sizes ?? [])
          .map((s: { name: string; price: number }) => ({
            name: s.name,
            price: basePrice + Number(s.price),
          }))
          .sort((a: PublicMenuSize, b: PublicMenuSize) => a.price - b.price),
      };
    };

    const categories: PublicMenuCategory[] = categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      items: itemRows.filter((i) => i.category_id === c.id).map(toItem),
    }));

    // Items whose category was deleted/unset still deserve a place on the menu.
    const knownIds = new Set(categoryRows.map((c) => c.id));
    const uncategorised = itemRows.filter((i) => !knownIds.has(i.category_id));

    if (uncategorised.length > 0) {
      categories.push({
        id: "other",
        name: "Other",
        items: uncategorised.map(toItem),
      });
    }

    return {
      restaurantName: restaurant.name,
      // An empty category is just noise on a browse-only page.
      categories: categories.filter((c) => c.items.length > 0),
    };
  },
);
