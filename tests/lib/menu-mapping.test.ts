import { describe, expect, it } from "vitest";

import { mapMenuItems, type MenuItemRow } from "@/lib/menu-mapping";

function row(overrides: Partial<MenuItemRow> = {}): MenuItemRow {
  return {
    id: "i1",
    name: "Pizza",
    description: null,
    price: 250,
    image_url: null,
    available: true,
    category_id: "c1",
    ...overrides,
  };
}

const categories = new Map([["c1", "Mains"]]);

describe("mapMenuItems", () => {
  it("fills in safe defaults for empty database fields", () => {
    const [item] = mapMenuItems([row({ available: null })], categories);

    expect(item).toMatchObject({
      description: "",
      image: "",
      diet: null,
      available: true,
      category: "Mains",
      categoryId: "c1",
      sizes: undefined,
      addons: undefined,
    });
  });

  it("only hides an item when available is exactly false", () => {
    expect(
      mapMenuItems([row({ available: false })], categories)[0].available,
    ).toBe(false);
    expect(
      mapMenuItems([row({ available: null })], categories)[0].available,
    ).toBe(true);
  });

  it("turns prices that arrive as text into numbers", () => {
    const [item] = mapMenuItems(
      [
        row({
          price: "120.50" as unknown as number,
          menu_item_sizes: [
            { id: "s", name: "L", price: "40" as unknown as number },
          ],
        }),
      ],
      categories,
    );

    expect(item.price).toBe(120.5);
    expect(item.sizes?.[0].price).toBe(40);
  });

  it("orders sizes by the owner's order, then cheapest first (Half before Full)", () => {
    const [item] = mapMenuItems(
      [
        row({
          menu_item_sizes: [
            { id: "full", name: "Full", price: 100, sort_order: 2 },
            { id: "half", name: "Half", price: 0, sort_order: 1 },
            { id: "x", name: "Same order, dearer", price: 50, sort_order: 3 },
            { id: "y", name: "Same order, cheaper", price: 10, sort_order: 3 },
          ],
        }),
      ],
      categories,
    );

    expect(item.sizes?.map((s) => s.id)).toEqual(["half", "full", "y", "x"]);
  });

  it("copes with a missing category", () => {
    const [item] = mapMenuItems([row({ category_id: null })], categories);

    expect(item.category).toBe("");
    expect(item.categoryId).toBe("");
  });
});
