import { describe, expect, it } from "vitest";

import { buildUpiLink, isValidUpiId } from "@/lib/upi";

describe("isValidUpiId", () => {
  it.each([
    "7439920798@axl",
    "name.surname@okhdfcbank",
    "a-b_c@ybl",
    "shop99@paytm",
  ])("accepts %s", (id) => expect(isValidUpiId(id)).toBe(true));

  it.each([
    "",
    "no-at-sign",
    "x@",
    "@ybl",
    "a@b", // handle too short
    "name@123bank", // handle must start with a letter
    "has space@ybl",
    "a@b@c",
    `${"x".repeat(101)}@ybl`,
  ])("rejects %j", (id) => expect(isValidUpiId(id)).toBe(false));
});

describe("buildUpiLink", () => {
  it("builds the link a UPI app opens with everything filled in", () => {
    const link = buildUpiLink({
      upiId: "shop@ybl",
      payeeName: "White Cave",
      amount: 394,
      note: "Table 4",
    });

    expect(link).toBe(
      "upi://pay?pa=shop@ybl&pn=White%20Cave&am=394.00&cu=INR&tn=Table%204",
    );
  });

  it("always writes two decimals for the amount", () => {
    expect(
      buildUpiLink({ upiId: "a@b", payeeName: "x", amount: 99.5, note: "n" }),
    ).toContain("am=99.50");
  });

  it("escapes special characters and limits name and note length", () => {
    const link = buildUpiLink({
      upiId: "a@bc",
      payeeName: `Cafe & Bar ${"x".repeat(100)}`,
      amount: 1,
      note: `Table #4 ${"y".repeat(100)}`,
    });
    const params = new URL(link.replace("upi://", "https://x/")).searchParams;

    expect(params.get("pn")).toHaveLength(60);
    expect(params.get("pn")?.startsWith("Cafe & Bar")).toBe(true);
    expect(params.get("tn")).toHaveLength(40);
    expect(link).not.toContain("&Bar"); // the & in the name was escaped
  });
});
