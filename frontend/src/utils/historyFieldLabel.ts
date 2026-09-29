/**
 * Label for one field of an employment-history period card.
 *
 * A period can hold a field with NO value: a "gap" row recorded on purpose to
 * say the field was blank from X to Y (see `_is_gap_period_row` on the
 * backend). That is not the same as the period carrying no entry for the field
 * at all — the first shows as "NA", the second keeps the caller's fallback.
 */
export const historyFieldLabel = (
  field?: { name?: string | null } | null,
  fallback = "-",
): string => (field ? field.name || "NA" : fallback);

export default historyFieldLabel;
