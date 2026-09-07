/**
 * Shared date/time presentation helpers.
 *
 * These are pure functions extracted from duplicated component code.
 * Behavior is preserved exactly: all values are parsed with `new
 * Date(iso)` and formatted with the browser/server default locale and
 * timezone — nothing about timezone or locale semantics changed here.
 */

/** "9:00 AM" — single time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "9:00 AM – 10:00 AM" (or just the start time when end is absent). */
export function formatTimeRange(startIso: string, endIso?: string | null): string {
  const start = formatTime(startIso);
  if (!endIso) return start;
  return `${start} – ${formatTime(endIso)}`;
}

/** "Wed, Sep 9" — short weekday + month + day. */
export function formatDateLine(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Parts used by the compact date tile: month label, day number, weekday label. */
export function formatDateTile(iso: string): {
  month: string;
  day: string;
  weekday: string;
} {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }),
    day: d.toLocaleDateString(undefined, { day: "numeric" }),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
  };
}
