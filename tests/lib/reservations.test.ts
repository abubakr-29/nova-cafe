import { describe, expect, it } from "vitest";

import {
  HOLD_AFTER_MINUTES,
  HOLD_BEFORE_MINUTES,
  applyBookingHold,
  bookingPhase,
  defaultBookingTime,
  formatBookingTime,
  parseLocalInput,
  toLocalInputValue,
} from "@/lib/reservations";
import type { RestaurantTable } from "@/types/table";

const MIN = 60_000;
const booked = Date.UTC(2026, 10, 1, 14, 0, 0); // any moment
const iso = new Date(booked).toISOString();

describe("bookingPhase", () => {
  it("has no phase without a booking or without a clock", () => {
    expect(bookingPhase(undefined, booked)).toBe("none");
    expect(bookingPhase(iso, 0)).toBe("none");
    expect(bookingPhase("not a date", booked)).toBe("none");
  });

  it("moves from upcoming to holding to expired at exactly the hold window edges", () => {
    expect(bookingPhase(iso, booked - (HOLD_BEFORE_MINUTES + 1) * MIN)).toBe(
      "upcoming",
    );
    expect(bookingPhase(iso, booked - HOLD_BEFORE_MINUTES * MIN)).toBe(
      "holding",
    );
    expect(bookingPhase(iso, booked)).toBe("holding");
    expect(bookingPhase(iso, booked + HOLD_AFTER_MINUTES * MIN)).toBe(
      "holding",
    );
    expect(bookingPhase(iso, booked + (HOLD_AFTER_MINUTES + 1) * MIN)).toBe(
      "expired",
    );
  });

  it("uses the same 30-minute windows as the database", () => {
    // The functions place_order and get_customer_table_view use 30 minutes.
    expect(HOLD_BEFORE_MINUTES).toBe(30);
    expect(HOLD_AFTER_MINUTES).toBe(30);
  });
});

describe("applyBookingHold", () => {
  const table = (status: RestaurantTable["status"]) =>
    ({ id: "t", name: "T1", status, reservedFor: iso }) as RestaurantTable;

  it("shows a free table as reserved only while the hold is active", () => {
    expect(applyBookingHold(table("available"), booked).status).toBe(
      "reserved",
    );
    expect(
      applyBookingHold(table("available"), booked - 2 * 60 * MIN).status,
    ).toBe("available");
    expect(
      applyBookingHold(table("available"), booked + 2 * 60 * MIN).status,
    ).toBe("available");
  });

  it("never overrides a table that is already in use", () => {
    expect(applyBookingHold(table("occupied"), booked).status).toBe("occupied");
  });
});

describe("local time helpers", () => {
  it("round-trips a time through the datetime-local format", () => {
    const ms = new Date(2026, 10, 1, 20, 30).getTime();

    expect(toLocalInputValue(ms)).toBe("2026-11-01T20:30");
    expect(parseLocalInput("2026-11-01T20:30")).toBe(ms);
  });

  it("returns NaN for an empty or invalid value", () => {
    expect(parseLocalInput("")).toBeNaN();
    expect(parseLocalInput("garbage")).toBeNaN();
  });

  it("suggests the next half hour that is at least 30 minutes away", () => {
    for (const [h, m] of [
      [10, 0],
      [10, 5],
      [10, 29],
      [10, 31],
      [23, 45],
    ]) {
      const now = new Date(2026, 10, 1, h, m).getTime();
      const suggested = parseLocalInput(defaultBookingTime(now));

      expect(suggested - now).toBeGreaterThanOrEqual(30 * MIN);
      expect(suggested - now).toBeLessThan(60 * MIN);
      expect([0, 30]).toContain(new Date(suggested).getMinutes());
    }
  });
});

describe("formatBookingTime", () => {
  it("shows only the time for today, and the date for other days", () => {
    const now = new Date(2026, 10, 1, 12, 0).getTime();
    const today = new Date(2026, 10, 1, 20, 30).toISOString();
    const later = new Date(2026, 10, 5, 20, 30).toISOString();

    expect(formatBookingTime(today, now)).not.toMatch(/Nov/);
    expect(formatBookingTime(later, now)).toMatch(/Nov/);
  });
});
