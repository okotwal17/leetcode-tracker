// Helpers for the ISO date strings ("YYYY-MM-DD") the backend uses for repeat_on.
// We deliberately avoid `new Date("2026-07-21")` for display: that parses as UTC
// midnight and can render as the *previous* day in western timezones. Working on
// the string directly sidesteps the whole timezone class of bugs.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Today's LOCAL date as "YYYY-MM-DD" — matches how the backend computes the feed.
// The "en-CA" locale formats dates as YYYY-MM-DD, which is the ISO shape we want
// (and it stays local, unlike toISOString() which is UTC and can be off by a day).
export const todayISO = (): string => new Date().toLocaleDateString("en-CA");

// "2026-07-21" -> "Jul 21, 2026". Returns null for null so callers can branch.
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// A friendly relative label for the feed: "Today", "Overdue by 3 days", etc.
export function relativeDueLabel(iso: string | null): string | null {
  if (!iso) return null;
  const today = todayISO();
  if (iso === today) return "Due today";
  if (iso < today) {
    const days = daysBetween(iso, today);
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  const days = daysBetween(today, iso);
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

// Whole days between two ISO dates (a < b assumed). Uses UTC on both ends so the
// subtraction isn't skewed by daylight-saving offsets.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}
