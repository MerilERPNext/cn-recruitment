import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./Button";

interface SelectOption<T = string> {
    label: string;
    value: T;
}

interface SelectProps<T, O extends SelectOption<T> = SelectOption<T>> {
    label?: string;
    options: O[];
    value: O;
    onChange: (value: O) => void;
    disabled?: boolean;
    className?: string;
    searchable?: boolean;
}

export const Select = <
    T extends string | number,
    O extends SelectOption<T> = SelectOption<T>,
>({
    label,
    options,
    value,
    onChange,
    disabled = false,
    className = "",
    searchable = false,
}: SelectProps<T, O>) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleOptionCount, setVisibleOptionCount] = useState(20);
    const ref = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(
        () => options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase())),
        [options, searchTerm],
    );
    const visibleOptions = filteredOptions.slice(0, visibleOptionCount);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (!open) {
            setSearchTerm("");
            setVisibleOptionCount(20);
        }
    }, [open]);

    return (
        <div className={`w-64 ${className}`} ref={ref}>
            {label && (
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <Button
                variant="subtle"
                size="md"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`
          flex w-full items-center justify-between
          rounded-lg border border-gray-300
          bg-white px-4 py-2.5
          text-gray-900
          shadow-sm transition
          focus:outline-none focus:ring-2 focus:ring-primary-500/30
          hover:border-gray-400
          ${disabled
                        ? "cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : ""
                    }
        `}
            >
                <span className="truncate font-medium">{value.label}</span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </Button>

            {open && !disabled && (
                <div
                    className="
            absolute z-50 mt-2 w-64
            rounded-xl border border-border
            bg-card shadow-lg
            animate-in fade-in zoom-in-95
          "
                >
                    {searchable && (
                        <div className="p-2 pb-1">
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setVisibleOptionCount(20);
                                }}
                                placeholder="Search..."
                                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                aria-label={`Search ${label ?? "options"}`}
                            />
                        </div>
                    )}
                    <ul
                        className="max-h-60 overflow-auto p-1"
                        onScroll={(event) => {
                            const list = event.currentTarget;
                            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 8) {
                                setVisibleOptionCount((count) => Math.min(count + 20, filteredOptions.length));
                            }
                        }}
                    >
                        {visibleOptions.map((opt) => {
                            const selected = opt.value === value.value;

                            return (
                                <li
                                    key={String(opt.value)}
                                    onClick={() => {
                                        onChange(opt);
                                        setOpen(false);
                                    }}
                                    className={`
                    flex cursor-pointer items-center
                    rounded-lg px-3 py-2 text-sm
                    transition
                    ${selected
                                            ? "bg-primary/20 text-primary font-medium"
                                            : "text-text-title hover:bg-slate-500/10"
                                        }
                  `}
                                >
                                    {opt.label}
                                </li>
                            );
                        })}
                        {visibleOptions.length === 0 && (
                            <li className="px-3 py-2 text-sm text-text-body2">No options found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
