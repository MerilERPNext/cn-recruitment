import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export type FilterOption = { label: string; value: string };

/** Date-range value (ISO yyyy-mm-dd strings). */
export type DateRange = { from: string; to: string };

/** Numeric-range value (strings as typed; empty = unbounded). */
export type NumberRange = { min: string; max: string };

export type FilterField = {
  /** Unique key — also the key in the values object. */
  key: string;
  label: string;
  /**
   * "single"      → stores a string value;
   * "multi"       → stores string[] (with Select All);
   * "daterange"   → stores { from, to } (two date inputs);
   * "numberrange" → stores { min, max } (two number inputs).
   */
  type: "single" | "multi" | "daterange" | "numberrange";
  /** Required for single/multi; ignored for date/number ranges. */
  options?: FilterOption[];
  /** Trigger placeholder. Defaults to "Search". */
  placeholder?: string;
  /** Show the in-dropdown search box. Defaults to true. */
  searchable?: boolean;
  /**
   * Conditionally reveal another field. For a "single" field, when its value
   * equals `when`, `field` is rendered below it (e.g. Time = "Custom" → a date
   * range). The revealed field stores its value under its own key.
   */
  reveal?: { when: string; field: FilterField };
};

/** key → selected value(s) keyed by field type. */
export type FilterValues = Record<
  string,
  string | string[] | DateRange | NumberRange
>;

type FilterPanelProps = {
  open: boolean;
  /** Header title. Defaults to "Select Filters". */
  title?: string;
  fields: FilterField[];
  values: FilterValues;
  onClose: () => void;
  onApply: (values: FilterValues) => void;
  /** Optional Cancel handler — defaults to onClose. */
  onCancel?: () => void;
};

// ─── One filter control (single / multi searchable dropdown) ─────────────────
const FilterSelect = ({
  field,
  value,
  onChange,
}: {
  field: FilterField;
  value: string | string[];
  onChange: (next: string | string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const searchable = field.searchable ?? true;
  const isMulti = field.type === "multi";
  const fieldOptions = field.options ?? [];
  const selected: string[] = isMulti
    ? (value as string[]) ?? []
    : value
      ? [value as string]
      : [];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = search.trim().toLowerCase();
  const visibleOptions = q
    ? fieldOptions.filter((o) => o.label.toLowerCase().includes(q))
    : fieldOptions;

  const allSelected =
    fieldOptions.length > 0 &&
    fieldOptions.every((o) => selected.includes(o.value));

  const toggleMulti = (val: string) => {
    const set = new Set(selected);
    if (set.has(val)) {
      set.delete(val);
    } else {
      set.add(val);
    }
    onChange(Array.from(set));
  };
  const toggleAll = () =>
    onChange(allSelected ? [] : fieldOptions.map((o) => o.value));
  const selectSingle = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  // Selected options as chips (multi) — shown in a horizontally-scrollable row.
  const selectedChips = fieldOptions.filter((o) => selected.includes(o.value));
  const singleLabel = fieldOptions.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="relative" ref={ref}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`flex min-h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 text-sm outline-none transition ${
          open ? "border-primary ring-1 ring-primary/30" : "border-gray-300"
        }`}
      >
        <div className="flex flex-1 items-center gap-1 overflow-x-auto flex-nowrap py-1 scrollbar-hide">
          {isMulti ? (
            selectedChips.length === 0 ? (
              <span className="px-1 text-gray-400">
                {field.placeholder || "Search"}
              </span>
            ) : (
              selectedChips.map((opt) => (
                <span
                  key={opt.value}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
                >
                  <span className="max-w-[140px] truncate">{opt.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMulti(opt.value);
                    }}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={`Remove ${opt.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )
          ) : (
            <span className={`px-1 ${value ? "text-gray-700" : "text-gray-400"}`}>
              {singleLabel || field.placeholder || "Search"}
            </span>
          )}
        </div>

        {isMulti && selectedChips.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            aria-label="Clear selection"
            className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {searchable && (
            <div className="relative px-2 pb-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-8 w-full rounded border border-gray-200 pl-2.5 pr-7 text-sm text-gray-700 outline-none focus:border-primary"
              />
              <Search className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {isMulti && !q && (
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 accent-primary"
                />
                Select All
              </label>
            )}
            {visibleOptions.map((o) =>
              isMulti ? (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggleMulti(o.value)}
                    className="size-4 accent-primary"
                  />
                  {o.label}
                </label>
              ) : (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => selectSingle(o.value)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                    value === o.value ? "font-medium text-primary" : "text-gray-700"
                  }`}
                >
                  {o.label}
                  {value === o.value && <Check className="h-4 w-4" />}
                </button>
              ),
            )}
            {visibleOptions.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No options</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Date-range control (two native date inputs) ─────────────────────────────
const DateRangeField = ({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <input
      type="date"
      value={value.from}
      onChange={(e) => onChange({ ...value, from: e.target.value })}
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-primary"
    />
    <input
      type="date"
      value={value.to}
      onChange={(e) => onChange({ ...value, to: e.target.value })}
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-primary"
    />
  </div>
);

// ─── Number-range control (Min / Max inputs) ─────────────────────────────────
const NumberRangeField = ({
  value,
  onChange,
}: {
  value: NumberRange;
  onChange: (next: NumberRange) => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <input
      type="number"
      value={value.min}
      onChange={(e) => onChange({ ...value, min: e.target.value })}
      placeholder="Enter Min Value"
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-primary"
    />
    <input
      type="number"
      value={value.max}
      onChange={(e) => onChange({ ...value, max: e.target.value })}
      placeholder="Enter Max Value"
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-primary"
    />
  </div>
);

// ─── Reusable right-side filter drawer ───────────────────────────────────────
const FilterPanel = ({
  open,
  title = "Select Filters",
  fields,
  values,
  onClose,
  onApply,
  onCancel,
}: FilterPanelProps) => {
  // Local draft so Cancel discards and Apply commits.
  const [draft, setDraft] = useState<FilterValues>(values);
  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  if (!open) return null;

  const setField = (
    key: string,
    next: string | string[] | DateRange | NumberRange,
  ) => setDraft((d) => ({ ...d, [key]: next }));

  const handleCancel = () => (onCancel ? onCancel() : onClose());
  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  // Empty value for a field by type.
  const emptyForField = (f: FilterField): string | string[] | DateRange | NumberRange =>
    f.type === "multi"
      ? []
      : f.type === "daterange"
        ? { from: "", to: "" }
        : f.type === "numberrange"
          ? { min: "", max: "" }
          : "";

  const clearedValues = (): FilterValues => {
    const out: FilterValues = {};
    for (const f of fields) {
      out[f.key] = emptyForField(f);
      if (f.reveal) out[f.reveal.field.key] = emptyForField(f.reveal.field);
    }
    return out;
  };

  const fieldHasValue = (f: FilterField): boolean => {
    const v = draft[f.key];
    if (f.type === "multi") return ((v as string[]) || []).length > 0;
    if (f.type === "daterange") {
      const r = v as DateRange;
      return !!(r?.from || r?.to);
    }
    if (f.type === "numberrange") {
      const r = v as NumberRange;
      return !!(r?.min || r?.max);
    }
    return !!v;
  };

  const isEmpty = !fields.some(fieldHasValue);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(values);

  const handleClear = () => setDraft(clearedValues());
  const handleDiscard = () => setDraft(values);

  // Render the control for a field (without the label wrapper).
  const renderControl = (f: FilterField) => {
    if (f.type === "daterange") {
      return (
        <DateRangeField
          value={(draft[f.key] as DateRange) ?? { from: "", to: "" }}
          onChange={(v) => setField(f.key, v)}
        />
      );
    }
    if (f.type === "numberrange") {
      return (
        <NumberRangeField
          value={(draft[f.key] as NumberRange) ?? { min: "", max: "" }}
          onChange={(v) => setField(f.key, v)}
        />
      );
    }
    return (
      <FilterSelect
        field={f}
        value={
          (draft[f.key] as string | string[]) ?? (f.type === "multi" ? [] : "")
        }
        onChange={(v) => setField(f.key, v)}
      />
    );
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
            aria-label="Close filters"
            className="text-gray-500 transition hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                {f.label}
              </label>
              {renderControl(f)}

              {/* Conditionally revealed field (e.g. Time = "Custom" → range). */}
              {f.reveal && draft[f.key] === f.reveal.when && (
                <div className="mt-3">
                  {f.reveal.field.label && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      {f.reveal.field.label}
                    </label>
                  )}
                  {renderControl(f.reveal.field)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={handleClear}
            disabled={isEmpty}
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Clear Filter
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isDirty ? handleDiscard : handleCancel}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {isDirty ? "Discard" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-black"
            >
              {isDirty ? "Apply Filter" : "Apply"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default FilterPanel;
