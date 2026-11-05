import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("starts with a BOM and uses Windows line endings (so Excel reads ₹ and names right)", () => {
    const csv = toCsv(["Name", "Price"], [["Tea", 50]]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe("\uFEFFName,Price\r\nTea,50\r\n");
  });

  it("quotes cells with commas, quotes or new lines, and doubles inner quotes", () => {
    const csv = toCsv(["A"], [["a,b"], ['say "hi"'], ["line1\nline2"]]);

    expect(csv).toBe('\uFEFFA\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"\r\n');
  });

  it("writes empty cells for null and undefined", () => {
    expect(toCsv(["A", "B", "C"], [[null, undefined, 0]])).toBe(
      "\uFEFFA,B,C\r\n,,0\r\n",
    );
  });

  it("keeps the rupee sign and non-English names intact", () => {
    expect(toCsv(["Name"], [["₹ चाय"]])).toContain("₹ चाय");
  });

  it("defuses text that a spreadsheet would run as a formula", () => {
    const csv = toCsv(["A"], [["=SUM(A1:A9)"], ["+1"], ["@cmd"], ["-5"]]);

    expect(csv).toBe("\uFEFFA\r\n'=SUM(A1:A9)\r\n'+1\r\n'@cmd\r\n'-5\r\n");
  });

  it("leaves real negative numbers alone", () => {
    expect(toCsv(["A"], [[-5]])).toBe("\uFEFFA\r\n-5\r\n");
  });
});
