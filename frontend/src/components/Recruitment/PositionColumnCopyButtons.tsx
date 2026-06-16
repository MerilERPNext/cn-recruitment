import { useEffect, type RefObject } from "react";

// Columns that should NOT get a "copy to all rows" button.
const SKIP_KEYS = ["position_number", "cost_center_allocations"];

const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

/**
 * Injects a small "copy" icon into each column header of the Position Details
 * datagrid. Clicking it copies that column's value (the first filled row) into
 * every position row — handled by `onCopyColumn(fieldKey)` in RequisitionForm.
 *
 * Form.io owns the table DOM, so the buttons are injected via DOM and re-applied
 * after every grid redraw (MutationObserver). Scoped to the `positions` grid
 * only; the nested Cost Center table and Position Number column are skipped.
 */
export default function PositionColumnCopyButtons({
  containerRef,
  onCopyColumn,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onCopyColumn: (fieldKey: string) => void;
}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Derive the field key for a body cell from its input's name attribute,
    // e.g. name="data[positions][0][location]" → "location". For the nested
    // cost center column the first captured key is "cost_center_allocations".
    const keyOfCell = (td: HTMLElement): string | null => {
      const named = td.querySelector("[name]") as HTMLElement | null;
      const name = named?.getAttribute("name") || "";
      const m = name.match(/\[positions\]\[\d+\]\[([^\]]+)\]/);
      return m?.[1] ?? null;
    };

    const inject = () => {
      const grid = container.querySelector(".formio-component-positions");
      if (!grid) return;
      const table = grid.querySelector("table");
      if (!table) return;

      const headerRow = table.querySelector(":scope > thead > tr");
      const bodyRow = table.querySelector(":scope > tbody > tr");
      if (!headerRow || !bodyRow) return;

      const ths = Array.from(headerRow.children) as HTMLElement[];
      const tds = Array.from(bodyRow.children) as HTMLElement[];

      tds.forEach((td, idx) => {
        const key = keyOfCell(td);
        if (!key || SKIP_KEYS.includes(key)) return;
        const th = ths[idx];
        if (!th || th.querySelector(".col-copy-btn")) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "col-copy-btn";
        btn.title = "Copy this column's value to all rows";
        btn.setAttribute("data-field", key);
        btn.innerHTML = COPY_SVG;
        btn.style.cssText =
          "margin-left:6px;border:none;background:transparent;cursor:pointer;color:#6b7280;display:inline-flex;vertical-align:middle;padding:0;";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onCopyColumn(key);
        });
        th.appendChild(btn);
      });
    };

    inject();
    const observer = new MutationObserver(() => inject());
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef, onCopyColumn]);

  return null;
}
