// A café's "business day" is decided in the database (see migration 013) because it
// depends on the café's timezone and day start time. These helpers only handle the
// date label it returns ("2026-10-28") — pure string/date maths, no timezone guessing.

export type BusinessDay = {
  /** The date label, e.g. "2026-10-28". */
  day: string;
  /** ISO moment the day starts. */
  startsAt: string;
  /** ISO moment the day ends (= the next day's start). */
  endsAt: string;
};

function parts(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

/** "2026-10-28" + 1 -> "2026-10-29". */
export function shiftDay(day: string, delta: number) {
  const { y, m, d } = parts(day);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** "Wed, 28 Oct" */
export function formatDay(day: string) {
  const { y, m, d } = parts(day);

  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Today", "Yesterday", or "Mon, 26 Oct". */
export function formatDayRelative(day: string, today: string | null) {
  if (today && day === today) return "Today";
  if (today && day === shiftDay(today, -1)) return "Yesterday";
  return formatDay(day);
}
