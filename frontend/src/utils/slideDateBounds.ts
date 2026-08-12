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
  // Set while ADDING a slide: the new slide is always the open ("Present")
  // period, so its end_date isn't editable.
  disableEndDate?: boolean;
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
 * Shift a `YYYY-MM-DD` string by whole days. Uses UTC arithmetic so the result
 * can't slip a day either side of midnight in the viewer's timezone.
 */
const shiftDays = (date: string | undefined, days: number): string | undefined => {
  if (!date) return undefined;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
};

/**
 * Bounds for the ADD form of a section (no slide being edited yet).
 *
 * A new slide always becomes the section's latest, open-ended period, so:
 *   - start_date must fall strictly AFTER the newest existing slide's start —
 *     one day later at the earliest — and never before the joining date. With
 *     no existing slide, only the joining-date floor applies.
 *   - end_date isn't editable at all (the new slide runs to "Present"; the
 *     previous slide's end is closed by the backend reflow).
 *
 * The newest start is taken as the max across the list rather than trusting
 * `list[0]`, so the floor holds regardless of how the caller ordered it.
 */
export function computeAddSlideBounds(
  list: any[],
  joiningDate?: string | null,
): SlideDateBounds {
  const joining = toDateOnly(joiningDate);
  const latestStart = (Array.isArray(list) ? list : []).reduce<string | undefined>(
    (acc, it) => maxDate(acc, toDateOnly(it?.from_date)),
    undefined,
  );
  return {
    startMinDate: maxDate(joining, shiftDays(latestStart, 1)),
    disableEndDate: true,
  };
}

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
 *   - end_date can move forward only to the day BEFORE the newer (later) slide
 *     starts, so it fills the gap ahead without ever overlapping that slide.
 *     Only the latest slide has no upper limit.
 *     (e.g. slides A 5 Aug–Present, B 15 Jul–4 Aug, C 1 Jul–14 Jul: editing B
 *     gives start_date 1 Jul–4 Aug and end_date 15 Jul–4 Aug. With a gap —
 *     newer slide starting 20 Aug — B's end could run to 19 Aug.)
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

  // end_date ceiling: the day BEFORE the newer slide starts. The end can only
  // grow into the gap ahead of it, never onto or past the newer slide, so that
  // slide is never overlapped and the backend never has to reflow its start.
  // Floored at this slide's own start so a same-start newer neighbour (two
  // cards sharing a from_date) can't produce an inverted, unusable range.
  // No upper limit when this is already the latest slide.
  let endMaxDate: string | undefined;
  if (newer) {
    endMaxDate = maxDate(shiftDays(toDateOnly(newer.from_date), -1), ownStart);
  }

  return {
    startMinDate,
    startMaxDate: ownEnd,
    endMinDate: ownStart,
    endMaxDate,
    disableStartDate: !!(older && older.can_edit === false),
  };
}
