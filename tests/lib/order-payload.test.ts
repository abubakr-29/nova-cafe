import { describe, expect, it } from "vitest";

import { toOrderLines } from "@/lib/order-payload";

import { makeCartItem } from "../helpers";

describe("toOrderLines", () => {
  it("sends ids and quantities, and never a price", () => {
    const lines = toOrderLines([
      makeCartItem({
        quantity: 2,
        size: { id: "s-1", name: "Large", price: 40 },
        addons: [{ id: "a-1", name: "Shot", price: 30 }],
        note: "hot",
        guestIndex: 1,
      }),
    ]);

    expect(lines).toEqual([
      {
        menu_item_id: "m-1",
        quantity: 2,
        size_id: "s-1",
        addon_ids: ["a-1"],
        note: "hot",
        guest_index: 1,
      },
    ]);
    expect(JSON.stringify(lines)).not.toMatch(/price/i);
  });

  it("uses null for anything not chosen", () => {
    expect(toOrderLines([makeCartItem()])).toEqual([
      {
        menu_item_id: "m-1",
        quantity: 1,
        size_id: null,
        addon_ids: [],
        note: null,
        guest_index: null,
      },
    ]);
  });

  it("keeps guest 0 (the first guest) instead of dropping it", () => {
    expect(toOrderLines([makeCartItem({ guestIndex: 0 })])[0].guest_index).toBe(
      0,
    );
  });
});
