import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    renderOption
}: MultiSelectProps<T>) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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

    const filteredOptions = options.filter(
        (opt) =>
            String(opt[labelKey]).toLowerCase().includes(query.toLowerCase()) &&
            !selected.some((s) => s[valueKey] === opt[valueKey])
    );

    const addOption = (opt: T) => {
        onChange([...selected, opt]);
        setQuery("");
    };

    const removeOption = (opt: T) => {
        onChange(selected.filter((s) => s[valueKey] !== opt[valueKey]));
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
                onClick={() => setOpen(true)}
                className={`
          flex w-full items-center justify-between
          rounded-lg border border-gray-300
          bg-white px-4 py-2.5
          text-gray-900 shadow-sm transition
          focus:outline-none focus:ring-2 focus:ring-primary-500/30
          hover:border-gray-400
          ${disabled
                        ? "cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : ""
                    }
        `}
            >
                <div className="flex flex-wrap items-center gap-1 flex-1">
                    {selected.map((opt) => (
                        <span
                            key={String(opt[valueKey])}
                            className="
                flex items-center gap-1
                rounded-md bg-primary-50
                px-2 py-0.5 text-xs
                font-medium text-primary-600
              "
                        >
                            {String(opt[labelKey])}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeOption(opt);
                                }}
                                className="hover:text-primary-800"
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
                        onFocus={() => setOpen(true)}
                        placeholder={selected.length === 0 ? placeholder : ""}
                        className="
                            flex-1 min-w-[60px]
                            bg-transparent text-sm
                            text-gray-900 placeholder-gray-400
                            outline-none
                        "
                        disabled={disabled}
                    />

                </div>

                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </Button>

            {isLoading &&
                <div
                    className="
            absolute z-50 mt-2 w-full
            rounded-xl border border-gray-200
            bg-white shadow-lg
            animate-in fade-in zoom-in-95 flex flex-col gap-2 p-2
          ">
                    {Array.from({ length: 3 }).map(() => (
                        <div className="h-6 w-full bg-gray-200 rounded" />
                    ))}

                </div>}
            {/* Dropdown */}
            {open && !disabled && filteredOptions.length > 0 && (
                <div
                    className="
            absolute z-50 mt-2 w-full
            rounded-xl border border-gray-200
            bg-white shadow-lg
            animate-in fade-in zoom-in-95
          "
                >

                    <ul className="max-h-60 overflow-auto p-1">
                        {filteredOptions.map((opt) => (
                            <li
                                key={String(opt[valueKey])}
                                onClick={() => addOption(opt)}
                                className="
                                flex cursor-pointer items-center
                                rounded-lg px-3 py-2 text-sm
                                text-gray-700 transition
                                hover:bg-gray-100
                                "
                            >
                                {renderOption ? renderOption(opt) : String(opt[labelKey])}
                            </li>
                        ))}

                    </ul>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
