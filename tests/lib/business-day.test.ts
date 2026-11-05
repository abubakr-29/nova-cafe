import { describe, expect, it } from "vitest";

import { formatDay, formatDayRelative, shiftDay } from "@/lib/business-day";

describe("shiftDay", () => {
  it("moves across month and year ends", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("knows about leap years", () => {
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDay("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("moves by many days and by zero", () => {
    expect(shiftDay("2026-10-28", 7)).toBe("2026-11-04");
    expect(shiftDay("2026-10-28", 0)).toBe("2026-10-28");
  });
});

describe("formatDay", () => {
  it("writes weekday, day and month", () => {
    const text = formatDay("2026-10-28");

    expect(text).toContain("Wed");
    expect(text).toContain("28");
    expect(text).toContain("Oct");
  });
});

describe("formatDayRelative", () => {
  it("says Today and Yesterday", () => {
    expect(formatDayRelative("2026-10-28", "2026-10-28")).toBe("Today");
    expect(formatDayRelative("2026-10-27", "2026-10-28")).toBe("Yesterday");
  });

  it("uses the date for anything else, or when today is unknown", () => {
    expect(formatDayRelative("2026-10-20", "2026-10-28")).toContain("20");
    expect(formatDayRelative("2026-10-28", null)).toContain("28");
  });
});
