import { describe, expect, it } from "vitest";

import {
  MAX_ITEM_QUANTITY,
  areCartItemsEquivalent,
  getCartItemDetails,
  getCartItemUnitPrice,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";

import { makeCartItem } from "../helpers";

const large = { id: "s-l", name: "Large", price: 40 };
const shot = { id: "a-1", name: "Extra shot", price: 30 };
const oat = { id: "a-2", name: "Oat milk", price: 20 };

describe("areCartItemsEquivalent", () => {
  it("treats the same item with the same options as one line", () => {
    const a = makeCartItem({ size: large, addons: [shot, oat] });
    const b = makeCartItem({
      cartItemId: "c-2",
      size: large,
      addons: [oat, shot],
    });

    expect(areCartItemsEquivalent(a, b)).toBe(true);
  });

  it.each([
    ["a different item", { menuItemId: "m-2" }],
    ["a different size", { size: large }],
    ["a different note", { note: "no sugar" }],
    ["a different guest", { guestIndex: 1 }],
    ["different add-ons", { addons: [shot] }],
  ])("keeps %s on a separate line", (_label, change) => {
    expect(areCartItemsEquivalent(makeCartItem(), makeCartItem(change))).toBe(
      false,
    );
  });
});

describe("getCartItemUnitPrice", () => {
  it("is base price plus size plus every add-on", () => {
    expect(
      getCartItemUnitPrice(makeCartItem({ size: large, addons: [shot, oat] })),
    ).toBe(190);
  });

  it("is just the base price with no options", () => {
    expect(getCartItemUnitPrice(makeCartItem())).toBe(100);
  });
});

describe("getCartItemDetails", () => {
  it("lists size, add-ons and note in one line", () => {
    const text = getCartItemDetails(
      makeCartItem({ size: large, addons: [shot, oat], note: "no sugar" }),
    );

    expect(text).toBe('Large · Extra shot, Oat milk · "no sugar"');
  });

  it("is empty with no options", () => {
    expect(getCartItemDetails(makeCartItem())).toBe("");
  });
});

describe("updateCartItemQuantity", () => {
  const cart = [
    makeCartItem(),
    makeCartItem({ cartItemId: "c-2", menuItemId: "m-2" }),
  ];

  it("sets the quantity of just that line", () => {
    const next = updateCartItemQuantity(cart, "c-2", 3);

    expect(next.map((i) => i.quantity)).toEqual([1, 3]);
  });

  it("removes the line at zero or below", () => {
    expect(
      updateCartItemQuantity(cart, "c-1", 0).map((i) => i.cartItemId),
    ).toEqual(["c-2"]);
    expect(updateCartItemQuantity(cart, "c-1", -4)).toHaveLength(1);
  });

  it("keeps the maximum at 20, the same limit the database enforces per line", () => {
    expect(MAX_ITEM_QUANTITY).toBe(20);
  });

  it("never goes above the maximum", () => {
    const next = updateCartItemQuantity(cart, "c-1", 500);

    expect(next[0].quantity).toBe(MAX_ITEM_QUANTITY);
  });

  it("does not change the original cart", () => {
    updateCartItemQuantity(cart, "c-1", 9);

    expect(cart[0].quantity).toBe(1);
  });
});

describe("removeCartItem", () => {
  it("drops only the matching line", () => {
    const cart = [makeCartItem(), makeCartItem({ cartItemId: "c-2" })];

    expect(removeCartItem(cart, "c-1").map((i) => i.cartItemId)).toEqual([
      "c-2",
    ]);
  });
});
