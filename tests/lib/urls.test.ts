import { describe, expect, it } from "vitest";

import { menuUrl, tableUrl } from "@/lib/site-url";

describe("QR code addresses", () => {
  it("points a table code at the ordering menu of that table", () => {
    expect(tableUrl("https://tavro.famedia.co.in", "white-cave", "t-123")).toBe(
      "https://tavro.famedia.co.in/menu/white-cave/t-123",
    );
  });

  it("points the menu card at the public menu", () => {
    expect(menuUrl("https://tavro.famedia.co.in", "white-cave")).toBe(
      "https://tavro.famedia.co.in/menu/white-cave",
    );
  });

  it("escapes anything unusual in the slug", () => {
    expect(menuUrl("https://x.test", "a b/c")).toBe(
      "https://x.test/menu/a%20b%2Fc",
    );
  });
});
