import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/format-price";

describe("formatPrice", () => {
  it("shows whole rupees without decimals", () => {
    expect(formatPrice(120)).toBe("₹120");
    expect(formatPrice(0)).toBe("₹0");
  });

  it("shows two decimals when there are paise", () => {
    expect(formatPrice(99.5)).toBe("₹99.50");
    expect(formatPrice(10.05)).toBe("₹10.05");
  });
});
