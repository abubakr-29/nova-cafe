import { describe, expect, it } from "vitest";

import { toneFor } from "@/components/menu/menu-backdrop";

// The guest menu picks a background tone (and a drawing with it) from the
// category name. Same drawing = same tone, so the tone tells us which drawing.
const tone = (name: string) => toneFor(name, 0);

describe("category name -> tone and drawing", () => {
  it.each([
    ["Pizza", "Pizza & Calzone"],
    ["Sandwiches", "Club Sandwich"],
    ["Momos", "Dim Sum"],
    ["Soup", "Shorba"],
    ["Cold drinks", "Iced Tea"],
    ["Cold Coffee", "Cold drinks"], // cold wins over coffee
    ["Egg Roll", "Wraps & Rolls"], // roll wins over egg/breakfast
    ["Tea & Chai", "Masala Chai"],
    ["Hot Drinks", "Coffee"],
    ["Biryani", "Main Course - Rice"],
    ["Maggi", "Chinese"],
    ["Ice Cream", "Kulfi"],
  ])("%s and %s share a drawing", (a, b) => {
    expect(tone(a)).toBe(tone(b));
  });

  it("gives clearly different foods different tones", () => {
    const names = [
      "Pizza",
      "Sandwiches",
      "Momos",
      "Soup",
      "Maggi",
      "Pasta",
      "Tea & Chai",
      "Coffee",
      "Desserts",
    ];
    const tones = new Set(names.map(tone));

    expect(tones.size).toBe(names.length);
  });

  it("does not care about capital letters", () => {
    expect(tone("PIZZA")).toBe(tone("pizza"));
  });

  it("rotates through neutral tones for names it does not know", () => {
    const seen = new Set(
      [0, 1, 2, 3, 4, 5].map((i) => toneFor("Chef specials", i)),
    );

    expect(seen.size).toBe(3);
    expect(toneFor("Chef specials", -1)).toBeDefined();
  });

  it("never returns an empty tone, even for an empty name", () => {
    expect(toneFor("", 0)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
