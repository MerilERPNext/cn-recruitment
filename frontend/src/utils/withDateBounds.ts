/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep-clone a Form.io form schema and inject flatpickr min/max constraints on
 * the `datetime` component with the given `key` (searched recursively through
 * nested components / columns).
 *
 * Baking the bounds into the schema (rather than toggling at runtime) is the
 * reliable way to constrain a Form.io `datetime` field — the same reason
 * `withComponentDisabled` bakes `disabled`. Out-of-range days are greyed out
 * and not selectable in the calendar. Both `datePicker` and `widget` are set so
 * the constraint applies regardless of which one the underlying widget honours.
 *
 * `minDate` / `maxDate` are `YYYY-MM-DD` strings (or undefined to leave that
 * bound open).
 */
export function withDateBounds(
  schema: any,
  key: string,
  bounds: { minDate?: string; maxDate?: string },
): any {
  const clone = JSON.parse(JSON.stringify(schema));
  const min = bounds.minDate ?? null;
  const max = bounds.maxDate ?? null;

  const apply = (c: any): void => {
    c.datePicker = { ...(c.datePicker || {}), minDate: min, maxDate: max };
    c.widget = { ...(c.widget || { type: "calendar" }), minDate: min, maxDate: max };
  };

  const walk = (components: any[]): void => {
    for (const c of components) {
      if (c?.key === key) {
        apply(c);
      }
      if (Array.isArray(c?.components)) {
        walk(c.components);
      }
      if (Array.isArray(c?.columns)) {
        for (const col of c.columns) {
          if (Array.isArray(col?.components)) {
            walk(col.components);
          }
        }
      }
    }
  };

  if (Array.isArray(clone?.components)) {
    walk(clone.components);
  }
  return clone;
}
