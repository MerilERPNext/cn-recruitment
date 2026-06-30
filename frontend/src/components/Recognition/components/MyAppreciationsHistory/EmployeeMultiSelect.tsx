import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Option = { label: string; value: string };

type EmployeeMultiSelectProps = {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

// Searchable multi-select with chips + Select All (used as the employee filter
// in My Appreciations History).
const EmployeeMultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Search Employees",
}: EmployeeMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = search.trim().toLowerCase();
  const visible = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;
  const allSelected =
    options.length > 0 && options.every((o) => selected.includes(o.value));
  const chips = options.filter((o) => selected.includes(o.value));

  const toggle = (v: string) =>
    onChange(
      selected.includes(v)
        ? selected.filter((x) => x !== v)
        : [...selected, v],
    );
  const toggleAll = () =>
    onChange(allSelected ? [] : options.map((o) => o.value));

  return (
    <div className="relative w-full max-w-md" ref={ref}>
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
        className={`flex min-h-10 w-full cursor-pointer items-center gap-1.5 rounded-md border bg-white px-3 text-sm outline-none transition ${
          open ? "border-primary ring-2 ring-primary/15" : "border-gray-300"
        }`}
      >
        <Search className="size-4 shrink-0 text-gray-500" />
        <div className="flex flex-1 items-center gap-1 overflow-x-auto flex-nowrap py-1 scrollbar-hide">
          {chips.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            chips.map((c) => (
              <span
                key={c.value}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
              >
                <span className="max-w-[140px] truncate">{c.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(c.value);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={`Remove ${c.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        {chips.length > 0 && (
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
          <div className="relative px-2 pb-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-8 w-full rounded border border-gray-200 pl-2.5 pr-7 text-sm text-gray-700 outline-none focus:border-primary"
            />
            <Search className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {!q && options.length > 0 && (
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
            {visible.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="size-4 accent-primary"
                />
                <span className="truncate">{o.label}</span>
                {selected.includes(o.value) && (
                  <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                )}
              </label>
            ))}
            {visible.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No employees</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMultiSelect;
