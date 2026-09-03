import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../atoms/Button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Option = Record<string, any>;

interface MultiSelectProps<T extends Option> {
    label?: string;
    options: T[];
    selected: T[];
    onChange: (value: T[]) => void;
    labelKey: keyof T;
    valueKey: keyof T;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    isLoading?: boolean;
    renderOption?: (option: T) => React.ReactNode;
    searchKeys?: (keyof T)[];
}

const MultiSelect = <T extends Option>({
    label,
    options,
    selected,
    onChange,
    labelKey,
    valueKey,
    placeholder = "Select...",
    disabled = false,
    className = "",
    searchValue,
    onSearchChange,
    isLoading,
    renderOption,
    searchKeys,
}: MultiSelectProps<T>) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    /* ---------- calculate filtered options ---------- */
    const filteredOptions = useMemo(
        () => {
            const keysToSearch = searchKeys || [labelKey];
            return options.filter(
                (opt) => {
                    const searchStr = query.toLowerCase();
                    const matchesSearch = keysToSearch.some((key) =>
                        String(opt[key]).toLowerCase().includes(searchStr)
                    );
                    return matchesSearch && !selected.some((s) => s[valueKey] === opt[valueKey]);
                }
            );
        },
        [options, labelKey, query, selected, valueKey, searchKeys]
    );

    /* ---------- click outside ---------- */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ---------- adjust highlighted index when options change ---------- */
    useEffect(() => {
        if (highlightedIndex >= filteredOptions.length && filteredOptions.length > 0) {
            setHighlightedIndex(filteredOptions.length - 1);
        } else if (filteredOptions.length === 0) {
            setHighlightedIndex(0);
        }
    }, [filteredOptions.length]);

    /* ---------- scroll highlighted item into view ---------- */
    useEffect(() => {
        if (open && listRef.current) {
            const highlightedElement = listRef.current.children[
                highlightedIndex
            ] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                });
            }
        }
    }, [highlightedIndex, open]);

    const addOption = (opt: T) => {
        onChange([...selected, opt]);
        setQuery("");
        onSearchChange?.("");
    };

    const removeOption = (opt: T) => {
        onChange(selected.filter((s) => s[valueKey] !== opt[valueKey]));
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
        setQuery("");
        onSearchChange?.("");
    };

    return (
        <div className={`relative w-full ${className}`} ref={ref}>
            {label && (
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            {/* Control */}
            <Button
                variant="subtle"
                size="md"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={`
          flex w-full items-center justify-between
          rounded-lg border border-slate-200 dark:border-[#1E3A4C]
          bg-white dark:bg-[#0B1724] px-4 py-2.5
          text-slate-900 dark:text-slate-100 shadow-sm transition
          focus:outline-none focus:ring-2 focus:ring-cyan-500/30
          hover:border-slate-300 dark:hover:border-[#2A4E66]
          ${disabled
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
                        : ""
                    }
        `}
            >
                <div className="flex flex-wrap items-start gap-1 flex-1 max-h-[72px] overflow-y-auto">
                    {selected.map((opt) => (
                        <span
                            key={String(opt[valueKey])}
                            className="
                flex items-center gap-1.5
                rounded-md bg-cyan-50 dark:bg-cyan-950/60
                border border-cyan-200 dark:border-cyan-800/60
                px-2 py-0.5 text-xs
                font-medium text-cyan-800 dark:text-cyan-200
                transition-colors
              "
                        >
                            {String(opt[labelKey])}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeOption(opt);
                                }}
                                className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-100 ml-0.5 font-bold"
                            >
                                ×
                            </button>
                        </span>
                    ))}

                    <input
                        type="text"
                        value={searchValue ?? query}
                        onChange={(e) => {
                            onSearchChange?.(e.target.value);
                            setQuery(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => setOpen(true)}
                        onKeyDown={(e) => {
                            if (
                                e.key === "Backspace" &&
                                (searchValue ?? query) === "" &&
                                selected.length > 0
                            ) {
                                e.preventDefault();
                                removeOption(selected[selected.length - 1]);
                                return;
                            }

                            if (!open) return;

                            switch (e.key) {
                                case "ArrowDown":
                                    e.preventDefault();
                                    setHighlightedIndex((prev) =>
                                        prev < filteredOptions.length - 1 ? prev + 1 : prev
                                    );
                                    break;
                                case "ArrowUp":
                                    e.preventDefault();
                                    setHighlightedIndex((prev) =>
                                        prev > 0 ? prev - 1 : prev
                                    );
                                    break;
                                case "Enter":
                                    e.preventDefault();
                                    if (filteredOptions[highlightedIndex]) {
                                        addOption(filteredOptions[highlightedIndex]);
                                    }
                                    break;
                                case "Escape":
                                    e.preventDefault();
                                    setOpen(false);
                                    break;
                            }
                        }}
                        placeholder={selected.length === 0 ? placeholder : ""}
                        className="
              flex-1 min-w-[60px]
              bg-transparent text-sm
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              outline-none
            "
                        disabled={disabled}
                    />
                </div>

                {/* Clear + Chevron */}
                <div className="flex items-center gap-2">
                    {selected.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        >
                            Clear
                        </button>
                    )}

                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""
                            }`}
                    />
                </div>
            </Button>

            {/* Loading */}
            {isLoading && open && (
                <div
                    className="
            absolute z-50 mt-2 w-full
            rounded-xl border border-slate-200 dark:border-[#1E3A4C]
            bg-white dark:bg-[#102030] shadow-lg
            animate-in fade-in zoom-in-95 flex flex-col gap-2 p-2
          "
                >
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                    ))}
                </div>
            )}

            {/* Dropdown */}
            {open && !disabled && filteredOptions.length > 0 && (
                <div
                    className="
            absolute z-50 mt-2 w-full
            rounded-xl border border-slate-200 dark:border-[#1E3A4C]
            bg-white dark:bg-[#102030] shadow-xl
            animate-in fade-in zoom-in-95
          "
                >
                    <ul className="max-h-60 overflow-auto p-1" ref={listRef}>
                        {filteredOptions.map((opt, index) => (
                            <li
                                key={String(opt[valueKey])}
                                onClick={() => addOption(opt)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`
                  flex cursor-pointer items-center
                  rounded-lg px-3 py-2 text-sm
                  text-slate-700 dark:text-slate-200 transition
                  hover:bg-slate-100 dark:hover:bg-[#162A3E]
                  ${index === highlightedIndex
                                        ? "bg-cyan-50 dark:bg-[#162A3E] border-l-2 border-cyan-500 text-cyan-900 dark:text-cyan-200"
                                        : ""
                                    }
                `}
                            >
                                {renderOption
                                    ? renderOption(opt)
                                    : String(opt[labelKey])}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
