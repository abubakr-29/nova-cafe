import { describe, expect, it } from "vitest";

import { calculateBill, calculateGuestShares } from "@/lib/bill";

import { makeOrder, makeOrderItem } from "../helpers";

describe("calculateBill", () => {
  it("adds up subtotal, tax and total of every order", () => {
    const bill = calculateBill([
      makeOrder({ subtotal: 200, tax: 10, total: 210 }),
      makeOrder({ id: "o-2", subtotal: 100, tax: 5, total: 105 }),
    ]);

    expect(bill).toEqual({ subtotal: 300, tax: 15, total: 315 });
  });

  it("does not charge for cancelled orders", () => {
    const bill = calculateBill([
      makeOrder({ subtotal: 200, tax: 10, total: 210 }),
      makeOrder({
        id: "o-2",
        status: "cancelled",
        total: 999,
        subtotal: 900,
        tax: 99,
      }),
    ]);

    expect(bill.total).toBe(210);
  });

  it("is zero for no orders", () => {
    expect(calculateBill([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe("calculateGuestShares", () => {
  const guests = [
    { id: "a", name: "Guest 1" },
    { id: "b", name: "Guest 2" },
  ];

  it("charges assigned items to that guest and splits the rest equally", () => {
    const orders = [
      makeOrder({
        items: [
          makeOrderItem({
            orderItemId: "1",
            totalPrice: 200,
            assignedGuestId: "a",
          }),
          makeOrderItem({ orderItemId: "2", totalPrice: 100 }), // shared
          makeOrderItem({
            orderItemId: "3",
            totalPrice: 50,
            assignedGuestId: "ghost",
          }), // unknown guest = shared
        ],
      }),
    ];

    const [a, b] = calculateGuestShares(orders, guests, 0.05);

    // shared = 150, so 75 each
    expect(a).toMatchObject({
      guestId: "a",
      itemsTotal: 275,
      tax: 14,
      total: 289,
    });
    expect(b).toMatchObject({
      guestId: "b",
      itemsTotal: 75,
      tax: 4,
      total: 79,
    });
  });

  it("leaves out cancelled orders", () => {
    const shares = calculateGuestShares(
      [
        makeOrder({ items: [makeOrderItem({ totalPrice: 100 })] }),
        makeOrder({
          id: "o-2",
          status: "cancelled",
          items: [makeOrderItem({ totalPrice: 500 })],
        }),
      ],
      guests,
      0,
    );

    expect(shares.map((s) => s.itemsTotal)).toEqual([50, 50]);
  });

  it("returns no shares when there are no guests", () => {
    expect(calculateGuestShares([makeOrder()], [], 0.05)).toEqual([]);
  });

  it("stays within a rupee or two per guest of the bill (rounding)", () => {
    // Splitting odd amounts rounds each guest's share, so the shares may not
    // add up to the bill to the last rupee. This pins how far they can drift.
    const items = [makeOrderItem({ totalPrice: 101 })];
    const shares = calculateGuestShares([makeOrder({ items })], guests, 0.05);
    const sharesTotal = shares.reduce((sum, s) => sum + s.total, 0);

    expect(Math.abs(sharesTotal - 106)).toBeLessThanOrEqual(guests.length * 2);
  });
});
