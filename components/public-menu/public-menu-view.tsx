"use client";

import "@fontsource-variable/archivo/wdth.css";

import { useMemo } from "react";

import CustomerMenu from "@/components/customer/customer-menu";
import type { PublicMenuCategory } from "@/lib/public-menu";
import type { MenuCategory, MenuItem } from "@/types/menu";

type PublicMenuViewProps = {
  restaurantName: string;
  categories: PublicMenuCategory[];
};

/**
 * The browse-only menu a guest sees after scanning the café's menu card.
 * Same look as the ordering menu, without the "+" buttons.
 */
export default function PublicMenuView({
  restaurantName,
  categories,
}: PublicMenuViewProps) {
  const { menuCategories, menuItems } = useMemo(() => {
    const menuCategories: MenuCategory[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
    }));

    const menuItems: MenuItem[] = categories.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: "",
        price: item.price,
        category: category.name,
        categoryId: category.id,
        image: "",
        diet: item.diet,
        available: item.available,
        // Public sizes carry the full price; the menu list wants the extra.
        sizes: item.sizes.map((size) => ({
          id: `${item.id}-${size.name}`,
          name: size.name,
          price: size.price - item.price,
        })),
        addons: [],
      })),
    );

    return { menuCategories, menuItems };
  }, [categories]);

  const words = restaurantName.trim().split(/\s+/);

  return (
    <main className="font-menu relative isolate min-h-screen overflow-x-clip text-[#ece9e1]">
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="px-5 pb-5 pt-10">
          <h1 className="font-menu-display text-balance text-[clamp(2.75rem,14vw,4.5rem)] leading-[0.92]">
            {words.length === 2
              ? words.map((word) => (
                  <span key={word} className="block">
                    {word}
                  </span>
                ))
              : restaurantName}
          </h1>

          <p className="mt-3 text-sm text-white/60">
            Menu · To order, scan the code on your table.
          </p>
        </header>
      </div>

      <CustomerMenu categories={menuCategories} items={menuItems} readOnly />
    </main>
  );
}
