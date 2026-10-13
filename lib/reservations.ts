import { useSyncExternalStore } from "react";

import type { RestaurantTable } from "@/types/table";

// A table is "held" from HOLD_BEFORE_MINUTES before its booking time until
// HOLD_AFTER_MINUTES after it. These MUST match the 30-minute windows in the
// database functions place_order and get_customer_table_view.
export const HOLD_BEFORE_MINUTES = 30;
export const HOLD_AFTER_MINUTES = 30;

const MINUTE = 60_000;

export type BookingPhase = "none" | "upcoming" | "holding" | "expired";

/**
 * none     – no booking on this table
 * upcoming – booked, but the hold hasn't started (table is free to use)
 * holding  – inside the hold window (table is reserved)
 * expired  – the hold window has passed; the booking is stale and ignored
 *
 * `now === 0` means "clock not available yet" (server render) → none.
 */
export function bookingPhase(
  reservedFor: string | undefined,
  now: number,
): BookingPhase {
  if (!reservedFor || now === 0) return "none";

  const booked = Date.parse(reservedFor);
  if (Number.isNaN(booked)) return "none";

  if (now < booked - HOLD_BEFORE_MINUTES * MINUTE) return "upcoming";
  if (now <= booked + HOLD_AFTER_MINUTES * MINUTE) return "holding";
  return "expired";
}

/** Shows a free table as "reserved" while its booking hold is active. */
export function applyBookingHold(
  table: RestaurantTable,
  now: number,
): RestaurantTable {
  if (table.status !== "available") return table;

  return bookingPhase(table.reservedFor, now) === "holding"
    ? { ...table, status: "reserved" }
    : table;
}

// ---- clock -------------------------------------------------------------

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 15_000);
  return () => clearInterval(id);
}

// Rounded to the minute so the snapshot is stable between ticks.
const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;
const getServerSnapshot = () => 0;

/** Current time (ms), re-rendering the component about once a minute. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---- formatting / <input type="datetime-local"> helpers ----------------

/** "8:30 pm" if it's today, otherwise "Tue, 20 Oct, 8:30 pm". */
export function formatBookingTime(iso: string, now: number) {
  const booked = new Date(iso);
  const today = new Date(now || Date.now());

  const time = booked.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (booked.toDateString() === today.toDateString()) return time;

  const date = booked.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${date}, ${time}`;
}

/** ms → "YYYY-MM-DDTHH:mm" in the browser's local time. */
export function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (local time) → ms, or NaN if it isn't a valid time. */
export function parseLocalInput(value: string) {
  return value ? new Date(value).getTime() : NaN;
}

/** A sensible default booking time: the next half hour, at least 30 min away. */
export function defaultBookingTime(now: number) {
  const half = 30 * MINUTE;
  return toLocalInputValue(Math.ceil((now + half) / half) * half);
}
