"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

// A small month calendar in a sheet. Days are plain "YYYY-MM-DD" labels (the café's
// business days), so there is no timezone maths here. One day, or a range.
type DayPickerProps = {
  title: string;
  /** Selected day, or the start of the selected range. */
  start: string;
  /** Same as start for a single day. */
  end: string;
  /** Last day that can be picked (today). */
  max: string | null;
  /** Pick a range instead of one day. */
  range?: boolean;
  /** Longest range allowed, in days. */
  maxDays?: number;
  onPick: (start: string, end: string) => void;
  onClose: () => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function utc(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(a: string, b: string) {
  return Math.round((utc(a) - utc(b)) / 86_400_000);
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);

  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default function DayPicker({
  title,
  start,
  end,
  max,
  range = false,
  maxDays = 92,
  onPick,
  onClose,
}: DayPickerProps) {
  const [month, setMonth] = useState(end.slice(0, 7));
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [year, monthNumber] = month.split("-").map(Number);
  const leading =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from(
      { length: count },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];

  const canGoForward = !max || `${shiftMonth(month, 1)}-01` <= max;

  function disabled(day: string) {
    if (max && day > max) return true;

    return Boolean(anchor && Math.abs(daysBetween(day, anchor)) >= maxDays);
  }

  function pick(day: string) {
    if (!range) {
      onPick(day, day);
      onClose();
      return;
    }

    if (!anchor) {
      setAnchor(day);
      return;
    }

    onPick(day < anchor ? day : anchor, day < anchor ? anchor : day);
    onClose();
  }

  const lo = anchor ?? start;
  const hi = anchor ?? end;

  return (
    <div className="fixed inset-0 z-120 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close calendar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-label={title}
        className="relative w-full max-w-sm rounded-t-4xl border border-white/10 bg-[#101013] p-5 shadow-2xl sm:rounded-4xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/80">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5"
          >
            <ChevronLeft size={16} />
          </button>

          <p className="text-[15px] font-medium">
            {new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(
              "en-IN",
              { month: "long", year: "numeric", timeZone: "UTC" },
            )}
          </p>

          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center text-[11px] text-white/35">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;

            const inRange = day >= lo && day <= hi;
            const edge = day === lo || day === hi;
            const off = disabled(day);

            return (
              <button
                key={day}
                type="button"
                disabled={off}
                onClick={() => pick(day)}
                aria-pressed={inRange}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition ${
                  edge
                    ? "bg-[#d7a45a] font-semibold text-[#0b0b0d]"
                    : inRange
                      ? "bg-[#d7a45a]/20 text-[#d7a45a]"
                      : "text-white/80 hover:bg-white/8"
                } ${off ? "cursor-default opacity-25 hover:bg-transparent" : "cursor-pointer"} ${
                  day === max && !inRange ? "ring-1 ring-white/25" : ""
                }`}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>

        {range && (
          <p className="mt-4 text-center text-xs text-white/40">
            {anchor
              ? "Now pick the last day"
              : `Pick the first day (up to ${maxDays} days)`}
          </p>
        )}
      </section>
    </div>
  );
}
