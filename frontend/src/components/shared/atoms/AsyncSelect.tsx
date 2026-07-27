import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import useDebounce from "../../../hooks/useDebounce";

export interface SelectOption<T = string> {
    label: string;
    value: T;
}

interface AsyncSelectProps<T> {
    label?: string;
    value: SelectOption<T>;
    onChange: (value: SelectOption<T>) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    fetchOptions: (search: string, skip: number) => Promise<SelectOption<T>[]>;
}

export const AsyncSelect = <T extends string | number>({
    label,
    value,
    onChange,
    disabled = false,
    className = "",
    placeholder = "Search...",
    fetchOptions,
}: AsyncSelectProps<T>) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [options, setOptions] = useState<SelectOption<T>[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [skip, setSkip] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const loadOptions = async (search: string, currentSkip: number, append: boolean) => {
        try {
            setLoading(true);
            const results = await fetchOptions(search, currentSkip);
            if (append) {
                setOptions((prev) => {
                    const existingMap = new Map(prev.map(opt => [opt.value, opt]));
                    results.forEach(opt => existingMap.set(opt.value, opt));
                    return Array.from(existingMap.values());
                });
            } else {
                setOptions([{ label: 'Select', value: '' as T }, ...results]);
            }
            setHasMore(results.length === 20);
            setSkip(currentSkip + 20);
        } catch (error) {
            console.error("Failed to load options", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setSkip(0);
            loadOptions(debouncedSearch, 0, false);
        }
    }, [debouncedSearch, open]);

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
        }
    }, [open]);

    const handleScroll = (event: React.UIEvent<HTMLUListElement>) => {
        const list = event.currentTarget;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 8) {
            if (!loading && hasMore) {
                loadOptions(debouncedSearch, skip, true);
            }
        }
    };

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
                <span className="truncate font-medium">{value?.label || "Select"}</span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </Button>

            {open && !disabled && (
                <div
                    className="
            absolute z-50 mt-2 w-64
            rounded-xl border border-gray-200
            bg-white shadow-lg
            animate-in fade-in zoom-in-95
          "
                >
                    <div className="p-2 pb-1">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={placeholder}
                            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                            aria-label={`Search ${label ?? "options"}`}
                        />
                    </div>
                    <ul
                        className="max-h-60 overflow-auto p-1"
                        onScroll={handleScroll}
                    >
                        {options.map((opt) => {
                            const selected = opt.value === value?.value;

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
                                            ? "bg-primary-50 text-primary-600 font-medium"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }
                  `}
                                >
                                    {opt.label}
                                </li>
                            );
                        })}
                        {loading && (
                            <li className="flex justify-center px-3 py-2">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            </li>
                        )}
                        {!loading && options.length === 0 && (
                            <li className="px-3 py-2 text-sm text-gray-500">No options found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
