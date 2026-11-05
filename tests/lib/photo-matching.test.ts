import { describe, expect, it } from "vitest";

import {
  matchPhoto,
  nameFromFilename,
  normalizeName,
} from "@/lib/photo-matching";

describe("normalizeName", () => {
  it("lowercases, drops punctuation and reads & as and", () => {
    expect(normalizeName("Chicken BBQ  Pizza")).toBe("chicken bbq pizza");
    expect(normalizeName("Mac & Cheese")).toBe("mac and cheese");
    expect(normalizeName("  Club-Sandwich!! ")).toBe("club sandwich");
  });

  // Known gap: accented letters are dropped, so "Café Latte" becomes "caf latte"
  // and a photo called cafe-latte.jpg is not matched. If this gets fixed, this
  // test starts failing: delete the `.fails` and keep it as a normal test.
  it.fails("treats é like e", () => {
    expect(
      matchPhoto("cafe-latte.jpg", [{ id: "1", name: "Café Latte" }]).kind,
    ).toBe("exact");
  });
});

describe("nameFromFilename", () => {
  it.each([
    ["Fried_Rice (2).JPG", "fried rice"],
    ["margherita-pizza.jpg", "margherita pizza"],
    ["C:\\photos\\club sandwich.png", "club sandwich"],
    ["/home/me/Pasta.webp", "pasta"],
    ["burger copy.png", "burger"],
    ["burger_copy 2.png", "burger"],
  ])("%s -> %s", (file, expected) =>
    expect(nameFromFilename(file)).toBe(expected),
  );
});

describe("matchPhoto", () => {
  const items = [
    { id: "1", name: "Margherita Pizza" },
    { id: "2", name: "Paneer Tikka Masala" },
    { id: "3", name: "Club Sandwich" },
  ];

  it("pairs a file with the item of the same name, ignoring spaces and case", () => {
    for (const file of [
      "margherita-pizza.jpg",
      "MargheritaPizza.JPG",
      "margherita pizza (1).png",
    ]) {
      expect(matchPhoto(file, items)).toMatchObject({
        kind: "exact",
        itemId: "1",
      });
    }
  });

  it("calls two items with the same name ambiguous instead of guessing", () => {
    const result = matchPhoto("tea.jpg", [
      { id: "a", name: "Tea" },
      { id: "b", name: "tea" },
    ]);

    expect(result).toEqual({
      itemId: null,
      suggestions: ["a", "b"],
      kind: "ambiguous",
    });
  });

  it("suggests close names but does not assign them", () => {
    const result = matchPhoto("paneer-tikka.jpg", items);

    expect(result.kind).toBe("suggested");
    expect(result.itemId).toBeNull();
    expect(result.suggestions).toEqual(["2"]);
  });

  it("does not suggest a name that only shares one word out of three", () => {
    // "club" is shared, but 1 of 4 distinct words is too weak to offer.
    expect(matchPhoto("club-house.jpg", items).kind).toBe("none");
  });

  it("finds nothing for unrelated names or an empty name", () => {
    expect(matchPhoto("holiday.jpg", items).kind).toBe("none");
    expect(matchPhoto(".jpg", items).kind).toBe("none");
  });
});
