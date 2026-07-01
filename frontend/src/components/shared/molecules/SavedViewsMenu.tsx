import { useEffect, useRef } from "react";

type SavedViewsMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Saved views count shown in the header. */
  count?: number;
  /** Whether "Update Current View" is enabled. */
  canUpdate?: boolean;
  onUpdateView?: () => void;
  onSaveAsNew?: () => void;
  onSeeAllRecords?: () => void;
};

// Small dropdown anchored to its trigger. The parent must wrap the trigger +
// this menu in a `relative` container.
const SavedViewsMenu = ({
  open,
  onClose,
  count = 0,
  canUpdate = false,
  onUpdateView,
  onSaveAsNew,
  onSeeAllRecords,
}: SavedViewsMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const item = "block w-full px-4 py-1.5 text-left text-sm transition";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
    >
      <p className="px-4 pb-2 text-sm font-medium text-gray-900">
        Saved Views ({count})
      </p>
      <div className="border-t border-gray-100 pt-1">
        <button
          type="button"
          disabled={!canUpdate}
          onClick={() => {
            onUpdateView?.();
            onClose();
          }}
          className={`${item} ${
            canUpdate
              ? "text-blue-600 hover:bg-gray-50"
              : "cursor-not-allowed text-gray-300"
          }`}
        >
          Update Current View
        </button>
        <button
          type="button"
          onClick={() => {
            onSaveAsNew?.();
            onClose();
          }}
          className={`${item} text-blue-600 hover:bg-gray-50`}
        >
          Save As New View
        </button>
      </div>
      <div className="my-1 border-t border-gray-100" />
      <button
        type="button"
        onClick={() => {
          onSeeAllRecords?.();
          onClose();
        }}
        className={`${item} text-blue-600 hover:bg-gray-50`}
      >
        See All Records
      </button>
    </div>
  );
};

export default SavedViewsMenu;
