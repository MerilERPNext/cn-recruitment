/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep-clone a Form.io form schema and toggle `disabled` on the component with
 * the given `key` (searched recursively through nested components / columns).
 *
 * Baking `disabled` into the schema is the reliable way to render a Form.io
 * `datetime` field read-only — toggling `component.disabled` at runtime does not
 * consistently disable the underlying flatpickr widget. A disabled field still
 * keeps and submits its value, so a pre-seeded start date is preserved.
 */
export function withComponentDisabled(
  schema: any,
  key: string,
  disabled: boolean,
): any {
  const clone = JSON.parse(JSON.stringify(schema));

  const walk = (components: any[]): void => {
    for (const c of components) {
      if (c?.key === key) {
        c.disabled = disabled;
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
