/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { useGetEmployeeHoverData } from "../../hooks/useEmployee";
import formatToIndianDate from "../../utils/formatToIndianDate";

// Employee link fields in the requisition form whose inputs should show an
// employee hover card. Keys match the Form.io component keys (→ DOM class
// `.formio-component-<key>`).
const EMPLOYEE_FIELD_KEYS = [
  "hiring_manager",
  "hiring_lead",
  "reporting_manager",
  "replacement_for",
];

type ResolveEmployeeId = (
  fieldKey: string,
  rowIndex: number | null
) => string | undefined;

const stringToPastelColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 65%, 58%)`;
};

/**
 * Renders an employee hover card over the requisition form's employee <select>
 * inputs (Hiring Manager, Hiring Lead, per-position Reporting Manager /
 * Replacement For).
 *
 * Form.io owns the field DOM, so we can't wrap each input with React. Instead we
 * use event delegation on the form container (mouseover/mouseout) to detect when
 * the pointer is over an employee field, resolve the selected employee id from
 * the live form data, and render a portal card anchored to that field. This adds
 * no overlay over the inputs, so it never blocks selecting/typing.
 *
 * NOTE: This relies on Form.io's rendered class names + datagrid row markup, so
 * it is inherently more fragile than the React-wrapped cards in the Review and
 * detail views. It degrades gracefully — if a field/row can't be resolved, no
 * card is shown.
 */
export default function FormEmployeeHoverLayer({
  containerRef,
  resolveEmployeeId,
}: {
  containerRef: RefObject<HTMLElement | null>;
  resolveEmployeeId: ResolveEmployeeId;
}) {
  const { mutateAsync: fetchEmployee } = useGetEmployeeHoverData();

  const [anchor, setAnchor] = useState<{ rect: DOMRect; employeeId: string } | null>(
    null
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const overCardRef = useRef(false);
  const overFieldRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastIdRef = useRef<string>("");
  // The employee field element the pointer is currently inside, so we can ignore
  // mouseover/mouseout noise from its child elements (Choices widget internals).
  const currentElRef = useRef<HTMLElement | null>(null);
  const cardElRef = useRef<HTMLDivElement | null>(null);

  // Single debounced close: only hides once the pointer is off BOTH the field
  // and the card. The grace period lets the cursor cross the gap between them.
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!overFieldRef.current && !overCardRef.current) {
        currentElRef.current = null;
        setAnchor(null);
      }
    }, 200);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findEmployeeField = (target: HTMLElement | null) => {
      if (!target) return null;
      for (const key of EMPLOYEE_FIELD_KEYS) {
        const el = target.closest(
          `.formio-component-${key}`
        ) as HTMLElement | null;
        if (el && container.contains(el)) return { el, key };
      }
      return null;
    };

    // Position-row index = index of the field's <tr> among its sibling rows.
    const rowIndexOf = (el: HTMLElement): number | null => {
      const inPositions = el.closest(".formio-component-positions");
      if (!inPositions) return null;
      const tr = el.closest("tr");
      if (!tr || !tr.parentElement) return null;
      const idx = Array.from(tr.parentElement.children).indexOf(tr);
      return idx >= 0 ? idx : null;
    };

    const onOver = (e: Event) => {
      const found = findEmployeeField(e.target as HTMLElement);
      if (!found) return;

      overFieldRef.current = true;
      clearTimeout(hideTimer.current);

      // Same field as already shown → just keep it open (no re-anchor/refetch),
      // so moving within the field doesn't flicker the card.
      if (currentElRef.current === found.el) return;

      const rowIndex = rowIndexOf(found.el);
      const employeeId = resolveEmployeeId(found.key, rowIndex);
      if (!employeeId) return;

      currentElRef.current = found.el;
      setAnchor({ rect: found.el.getBoundingClientRect(), employeeId });

      if (lastIdRef.current !== employeeId) {
        lastIdRef.current = employeeId;
        setData(null);
        setImgError(false);
        setLoading(true);
        fetchEmployee(employeeId)
          .then((d) => setData(d))
          .catch(() => setData(null))
          .finally(() => setLoading(false));
      }
    };

    const onOut = (e: Event) => {
      if (!currentElRef.current) return;
      const related = (e as MouseEvent).relatedTarget as Node | null;
      // Still inside the same field, or moved onto the card → keep open.
      if (related && currentElRef.current.contains(related)) return;
      if (related && cardElRef.current?.contains(related)) return;
      overFieldRef.current = false;
      scheduleHide();
    };

    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseout", onOut);
    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseout", onOut);
      clearTimeout(hideTimer.current);
    };
  }, [containerRef, resolveEmployeeId, fetchEmployee, scheduleHide]);

  if (!anchor) return null;

  // Anchor the card to the right of the field, flipping/clamping to the viewport.
  const gap = 12;
  const cardW = 320;
  const cardMaxH = 360;
  let left = anchor.rect.right + gap;
  if (left + cardW + 12 > window.innerWidth) {
    left = Math.max(12, anchor.rect.left - gap - cardW);
  }
  let top = anchor.rect.top;
  if (top + cardMaxH + 12 > window.innerHeight) {
    top = Math.max(12, window.innerHeight - cardMaxH - 12);
  }

  const items: { label: string; value: any }[] = Array.isArray(data?.data)
    ? data.data
    : [];
  const map: Record<string, any> = {};
  items.forEach((it) => (map[it.label] = it.value));
  const headerFields = [
    "Full Name",
    "Designation",
    "Company Email",
    "Personal Email",
    "Image",
  ];
  const fullName = (map["Full Name"] as string) || "";

  return createPortal(
    <div
      ref={cardElRef}
      className="fixed z-[999]"
      style={{ top, left, width: cardW }}
      onMouseEnter={() => {
        overCardRef.current = true;
        clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        overCardRef.current = false;
        scheduleHide();
      }}
    >
      <div className="relative w-[320px] max-h-[360px] overflow-y-auto p-5 rounded-xl bg-white shadow-2xl border border-gray-100">
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-7 h-7 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="flex items-start gap-4">
              {map.Image && typeof map.Image === "string" && !imgError ? (
                <img
                  src={map.Image as string}
                  className="w-16 h-16 rounded-full object-cover"
                  alt="avatar"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                  style={{ background: stringToPastelColor(fullName || "U") }}
                >
                  {fullName.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-sm font-semibold text-gray-900 break-words">
                  {fullName || "—"}
                </p>
                <p className="text-sm text-gray-600 mt-0.5 break-words">
                  {map.Designation as string}
                </p>
                <p className="text-sm text-gray-500 mt-1 break-words">
                  {(map["Company Email"] || map["Personal Email"]) as string}
                </p>
              </div>
            </div>

            <hr className="my-3 border-gray-200" />

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {items
                .filter((it) => !headerFields.includes(it.label))
                .map((it, idx) => {
                  let displayValue: any = it.value || "—";
                  if (
                    it.label.toLowerCase().includes("date") &&
                    it.value &&
                    !isNaN(Date.parse(String(it.value)))
                  ) {
                    displayValue = formatToIndianDate(String(it.value));
                  }
                  return (
                    <div key={idx} className="min-w-0">
                      <p className="text-gray-500 truncate" title={it.label}>
                        {it.label}
                      </p>
                      <p className="font-medium text-gray-900 break-words">
                        {displayValue}
                      </p>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            Employee information not available
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
