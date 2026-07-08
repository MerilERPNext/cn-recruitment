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
 * Rules (reflow model — a slide may expand into a neighbour, whose touching
 * boundary the backend then reflows to match):
 *   - start_date can move back to the older (earlier) slide's START date, and
 *     never before the joining date. With no older slide it's floored at the
 *     joining date. (e.g. middle slide 1 Jun–30 Jun with an older 1 May–31 May
 *     slide -> start_date floor is 1 May; oldest slide -> floor is joining.)
 *   - start_date <= this slide's own end date.
 *   - end_date   >= this slide's own start date.
 *   - end_date can move forward to the newer (later) slide's END date. When the
 *     newer slide is open-ended (the current "Present" slide) OR this is the
 *     latest slide, the end_date has no upper limit. (e.g. middle slide with a
 *     newer open slide -> no end limit; oldest slide 1 May–31 May with a newer
 *     1 Jun–30 Jun slide -> end_date ceiling is 30 Jun.)
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

  // start_date floor: joining date, and as far back as the older slide's START
  // (moving onto it reflows the older slide's end to the day before).
  let startMinDate = joining;
  if (older) {
    startMinDate = maxDate(joining, toDateOnly(older.from_date));
  }

  // end_date ceiling: the newer slide's END date (moving onto it reflows the
  // newer slide's start). No upper limit when the newer slide is open-ended
  // ("Present") or this is already the latest slide.
  let endMaxDate: string | undefined;
  if (newer) {
    endMaxDate = toDateOnly(newer.to_date);
  }

  return {
    startMinDate,
    startMaxDate: ownEnd,
    endMinDate: ownStart,
    endMaxDate,
    disableStartDate: !!(older && older.can_edit === false),
  };
}
