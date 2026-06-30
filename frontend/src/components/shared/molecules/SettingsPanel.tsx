import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export type SettingsColumn = { key: string; label: string };
export type DisplayDensity = "comfort" | "compact" | "expanded";
export type TableSettings = {
  density: DisplayDensity;
  /** Column keys currently visible. */
  visibleColumns: string[];
};

type SettingsPanelProps = {
  open: boolean;
  /** Header title. Defaults to "Settings". */
  title?: string;
  /** Toggleable columns. */
  columns: SettingsColumn[];
  value: TableSettings;
  onClose: () => void;
  onApply: (settings: TableSettings) => void;
  onCancel?: () => void;
};

const DENSITIES: { label: string; value: DisplayDensity }[] = [
  { label: "Comfort", value: "comfort" },
  { label: "Compact", value: "compact" },
  { label: "Expanded", value: "expanded" },
];

// ─── Collapsible section header ──────────────────────────────────────────────
const SectionHeader = ({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex w-full items-center justify-between"
  >
    <span className="text-sm font-semibold text-gray-900">{title}</span>
    {open ? (
      <ChevronUp className="size-4 text-gray-400" />
    ) : (
      <ChevronDown className="size-4 text-gray-400" />
    )}
  </button>
);

// ─── Reusable table-settings drawer (display density + column visibility) ─────
const SettingsPanel = ({
  open,
  title = "Settings",
  columns,
  value,
  onClose,
  onApply,
  onCancel,
}: SettingsPanelProps) => {
  const [density, setDensity] = useState<DisplayDensity>(value.density);
  const [visible, setVisible] = useState<string[]>(value.visibleColumns);
  const [densityOpen, setDensityOpen] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(true);

  // Reset the draft each time the drawer opens.
  useEffect(() => {
    if (open) {
      setDensity(value.density);
      setVisible(value.visibleColumns);
    }
  }, [open, value]);

  if (!open) return null;

  const allSelected =
    columns.length > 0 && columns.every((c) => visible.includes(c.key));
  const toggleCol = (key: string) =>
    setVisible((v) =>
      v.includes(key) ? v.filter((k) => k !== key) : [...v, key],
    );
  const toggleAll = () =>
    setVisible(allSelected ? [] : columns.map((c) => c.key));
  const resetToDefault = () => {
    setVisible(columns.map((c) => c.key));
    setDensity("comfort");
  };

  const handleCancel = () => (onCancel ? onCancel() : onClose());
  const handleApply = () => {
    onApply({ density, visibleColumns: visible });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="text-gray-500 transition hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {/* Display Density */}
          <div className="border-b border-gray-100 py-4">
            <SectionHeader
              title="Display Density"
              open={densityOpen}
              onToggle={() => setDensityOpen((o) => !o)}
            />
            {densityOpen && (
              <div className="mt-3 space-y-2.5">
                {DENSITIES.map((d) => (
                  <label
                    key={d.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="radio"
                      name="display-density"
                      checked={density === d.value}
                      onChange={() => setDensity(d.value)}
                      className="size-4 accent-primary"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Column Settings */}
          <div className="py-4">
            <SectionHeader
              title="Column Settings"
              open={columnsOpen}
              onToggle={() => setColumnsOpen((o) => !o)}
            />
            {columnsOpen && (
              <div className="mt-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetToDefault}
                    className="text-xs font-medium text-gray-500 transition hover:text-gray-700"
                  >
                    Reset to default
                  </button>
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-4 accent-primary"
                  />
                  Select All
                </label>
                <div className="mt-1 space-y-1">
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={visible.includes(c.key)}
                        onChange={() => toggleCol(c.key)}
                        className="size-4 accent-primary"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-black"
          >
            Apply
          </button>
        </div>
      </aside>
    </div>
  );
};

export default SettingsPanel;
