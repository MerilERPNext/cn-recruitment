/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Date bounds for a single Employment-History slide's start/end date pickers.
 * Values are `YYYY-MM-DD` strings; `undefined` leaves that bound open.
 */
export interface SlideDateBounds {
  startMinDate?: string;
  startMaxDate?: string;
  endMinDate?: string;
  endMaxDate?: string;
  // When the previous (older) slide is a locked previous-employee tile, its
  // boundary can't move — the start_date field is frozen; only end_date edits.
  disableStartDate?: boolean;
}

/** Take the `YYYY-MM-DD` date part of an ISO / date string. */
export const toDateOnly = (iso?: string | null): string | undefined =>
  iso ? String(iso).slice(0, 10) : undefined;

/** Shift a `YYYY-MM-DD` date by `n` days, returning `YYYY-MM-DD`. */
const shiftDays = (isoDate: string, n: number): string => {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Later of two `YYYY-MM-DD` strings (they compare correctly lexicographically). */
const maxDate = (a?: string, b?: string): string | undefined => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
};

/**
 * Compute the start/end date bounds for editing one slide, given the full
 * section list (newest-first, as the backend returns it) and the employee's
 * joining date.
 *
 * Rules (no-overlap model, gaps preserved):
 *   - start_date >= joining date, and after the previous (older) slide's end.
 *   - start_date <= this slide's own end date.
 *   - end_date   >= this slide's own start date.
 *   - end_date   <= day before the next (newer) slide's start (open if latest).
 *   - If the previous (older) slide is a locked previous-employee tile
 *     (can_edit === false), the start_date is frozen (disableStartDate).
 */
export function computeSlideDateBounds(
  list: any[],
  item: any,
  joiningDate?: string | null,
): SlideDateBounds {
  const joining = toDateOnly(joiningDate);
  const idx = Array.isArray(list) ? list.indexOf(item) : -1;

  // List is newest-first: the newer (later) neighbour precedes in the array,
  // the older (earlier) neighbour follows it.
  const newer = idx > 0 ? list[idx - 1] : null;
  const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  const ownStart = toDateOnly(item?.from_date);
  const ownEnd = toDateOnly(item?.to_date);

  // start_date floor: joining date, and never overlapping the older slide.
  let startMinDate = joining;
  if (older) {
    const olderEnd = toDateOnly(older.to_date);
    const afterOlder = olderEnd ? shiftDays(olderEnd, 1) : undefined;
    startMinDate = maxDate(joining, afterOlder);
  }

  // end_date ceiling: day before the newer slide's start (open if this is the
  // latest slide).
  let endMaxDate: string | undefined;
  if (newer) {
    const newerStart = toDateOnly(newer.from_date);
    endMaxDate = newerStart ? shiftDays(newerStart, -1) : undefined;
  }

  return {
    startMinDate,
    startMaxDate: ownEnd,
    endMinDate: ownStart,
    endMaxDate,
    disableStartDate: !!(older && older.can_edit === false),
  };
}
